import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContentEntryCreateSchema,
  ContentEntryListQuerySchema,
  ContentEntryListResponseSchema,
  ContentEntryMutationResponseSchema,
  ContentEntryPreviewResponseSchema,
  ContentEntryPreviewTokenSchema,
  ContentEntryPublishSchema,
  ContentEntryUpdateSchema,
  ContentEntryVersionListResponseSchema,
  ContentNavigationListResponseSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { listResponse } from "../../runtime/list-response";
import { CmsPrismaRepository } from "./cms.prisma-repository";
import { CMS_REPOSITORY } from "./cms.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ContentIdParamSchema = z.object({
  id: EntityIdSchema,
});

const ContentSlugParamSchema = z.object({
  slug: z.string().min(1),
});

@Injectable()
export class CmsService {
  constructor(
    @Inject(CMS_REPOSITORY)
    private readonly repository: CmsPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listEntries(query: unknown) {
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      await this.repository.listContentEntries({
        ...parsed,
        status: "published",
      } as any),
    );
  }

  async listAdminEntries(query: unknown) {
    this.authorization.requireStaffPermission("content:read");
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      await this.repository.listContentEntries(parsed as any),
    );
  }

  async getEntry(slug: unknown) {
    const parsedSlug = parseInput(ContentSlugParamSchema, { slug });
    const entry = await this.repository.getContentEntry(
      this.requestContext.getMarket(),
      this.requestContext.getLocale(),
      parsedSlug.slug,
    );
    if (!entry || entry.status !== "published") {
      throw new NotFoundException("内容不存在");
    }
    return ContentEntryMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: entry,
    });
  }

  async createEntry(body: unknown) {
    this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(ContentEntryCreateSchema, body);
    const item = await this.repository.createContentEntry(input);

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateEntry(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const input = parseInput(ContentEntryUpdateSchema, body);
    const item = await this.repository.updateContentEntry(
      parsedId.id,
      input as any,
    );

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** 发布支持定时发布与定时下线 需求 ADM-C-003 */
  async publishEntry(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const input = parseInput(ContentEntryPublishSchema, body);
    const item = await this.repository.publishContentEntry(parsedId.id, input);

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** 草稿预览链接 需求 ADM-C-004 */
  async createPreviewToken(id: unknown) {
    this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const entry = await this.repository.getContentEntryById(parsedId.id);
    if (!entry) {
      throw new NotFoundException("内容不存在");
    }
    const preview = await this.repository.createPreviewToken(parsedId.id);

    return {
      request_id: context.request_id,
      item: preview,
    };
  }

  async previewEntry(token: unknown) {
    const parsed = parseInput(ContentEntryPreviewTokenSchema, { token });
    const entryId = await this.repository.getEntryIdByPreviewToken(parsed.token);
    if (entryId === null) {
      throw new NotFoundException("预览链接无效或已过期");
    }
    const entry = await this.repository.getContentEntryById(entryId);
    if (!entry) {
      throw new NotFoundException("内容不存在");
    }
    return ContentEntryPreviewResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: entry,
    });
  }

  /** 内容版本历史 需求 ADM-C-005 */
  async listVersions(id: unknown) {
    this.authorization.requireStaffPermission("content:read");
    const parsedId = parseInput(ContentIdParamSchema, { id });
    return ContentEntryVersionListResponseSchema.parse(
      listResponse(await this.repository.listVersions(parsedId.id)),
    );
  }

  async archiveEntry(id: unknown) {
    this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const item = await this.repository.updateContentEntry(parsedId.id, {
      status: "archived",
    });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listNavigation() {
    const items = await this.repository.getNavigation(
      this.requestContext.getMarket(),
      this.requestContext.getLocale(),
    );
    return ContentNavigationListResponseSchema.parse(listResponse(items));
  }
}
