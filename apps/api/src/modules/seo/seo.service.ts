import { Inject, Injectable } from "@nestjs/common";
import {
  SeoRedirectCreateSchema,
  SeoRedirectListResponseSchema,
  SeoRedirectMutationResponseSchema,
  SeoSitemapResponseSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const SeoMetadataQuerySchema = z.object({
  path: z.string().min(1),
  market: z.string().min(1).optional(),
  locale: z.string().min(2).optional(),
});

const SeoRedirectIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class SeoService {
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

  getMetadata(query: unknown) {
    const parsed = parseInput(SeoMetadataQuerySchema, query);
    return this.stateStore.buildSeoMetadata(
      parsed.path,
      parsed.market ?? this.requestContext.getMarket(),
      parsed.locale ?? this.requestContext.getLocale(),
    );
  }

  getSitemap() {
    const context = this.requestContext.requireContext();
    return SeoSitemapResponseSchema.parse({
      request_id: context.request_id,
      item: this.stateStore.buildSitemap(),
    });
  }

  listRedirects() {
    this.authorization.requireStaffPermission("seo:read");
    return SeoRedirectListResponseSchema.parse(this.stateStore.listRedirects());
  }

  upsertRedirect(body: unknown) {
    const actor = this.authorization.requireStaffPermission("seo:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(SeoRedirectCreateSchema, body);
    const item = this.stateStore.upsertRedirect(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "seo.redirect.upsert",
      entity: "seo_redirect",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return SeoRedirectMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
