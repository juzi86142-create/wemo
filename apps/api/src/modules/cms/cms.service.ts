import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContentEntryCreateSchema,
  ContentEntryListQuerySchema,
  ContentEntryListResponseSchema,
  ContentEntryMutationResponseSchema,
  ContentEntryUpdateSchema,
  ContentNavigationListResponseSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CmsPrismaRepository } from "./cms.prisma-repository";
import { CMS_REPOSITORY } from "./cms.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { listResponse } from "../../runtime/list-response";
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

  listEntries(query: unknown) {
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      this.repository.listContentEntries({ ...parsed, status: "published" }),
    );
  }

  listAdminEntries(query: unknown) {
    this.authorization.requireStaffPermission("content:read");
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      this.repository.listContentEntries(parsed),
    );
  }

  getEntry(slug: unknown, type?: unknown) {
    const parsedSlug = parseInput(ContentSlugParamSchema, { slug });
    const parsedType =
      type === undefined ? undefined : String(type).trim() || undefined;
    const entry = this.repository.getContentEntry(
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

  createEntry(body: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(ContentEntryCreateSchema, body);
    const item = this.repository.createContentEntry(input);

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateEntry(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const input = parseInput(ContentEntryUpdateSchema, body);
    const item = this.repository.updateContentEntry(parsedId.id, input);

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  publishEntry(id: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const item = this.repository.updateContentEntry(parsedId.id, { status: "published" });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  archiveEntry(id: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const item = this.repository.updateContentEntry(parsedId.id, { status: "archived" });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listNavigation() {
    const items = this.repository.getNavigation(
      this.requestContext.getMarket(),
      this.requestContext.getLocale(),
    );
    return ContentNavigationListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}
