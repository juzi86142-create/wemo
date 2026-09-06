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
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceStateStore)
    private readonly stateStore: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listEntries(query: unknown) {
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      this.stateStore.listContentEntries({ ...parsed, status: "published" }),
    );
  }

  listAdminEntries(query: unknown) {
    this.authorization.requireStaffPermission("content:read");
    const parsed = parseInput(ContentEntryListQuerySchema, query);
    return ContentEntryListResponseSchema.parse(
      this.stateStore.listContentEntries(parsed),
    );
  }

  getEntry(slug: unknown, type?: unknown) {
    const parsedSlug = parseInput(ContentSlugParamSchema, { slug });
    const parsedType =
      type === undefined ? undefined : String(type).trim() || undefined;
    const entry = this.stateStore.getContentEntryBySlug(
      parsedSlug.slug,
      parsedType as never,
    );
    if (entry.status !== "published") {
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
    const item = this.stateStore.upsertContentEntry(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "content.entry.create",
      entity: "content_entry",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

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
    const before = this.stateStore.getContentEntryById(parsedId.id);
    const item = this.stateStore.upsertContentEntry({
      ...(input as any),
      id: parsedId.id,
    });

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "content.entry.update",
      entity: "content_entry",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  publishEntry(id: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const before = this.stateStore.getContentEntryById(parsedId.id);
    const item = this.stateStore.publishContentEntry(parsedId.id);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "content.entry.publish",
      entity: "content_entry",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  archiveEntry(id: unknown) {
    const actor = this.authorization.requireStaffPermission("content:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ContentIdParamSchema, { id });
    const before = this.stateStore.getContentEntryById(parsedId.id);
    const item = this.stateStore.archiveContentEntry(parsedId.id);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "content.entry.archive",
      entity: "content_entry",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return ContentEntryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listNavigation() {
    const items = this.stateStore.listNavigation();
    return ContentNavigationListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}
