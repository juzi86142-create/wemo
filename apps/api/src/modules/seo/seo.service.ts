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
import { SeoPrismaRepository } from "./seo.prisma-repository";
import { SEO_REPOSITORY } from "./seo.repository";
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
    @Inject(SEO_REPOSITORY)
    private readonly repository: SeoPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getMetadata(query: unknown) {
    const parsed = parseInput(SeoMetadataQuerySchema, query);
    const result = this.repository.getPageSeo({
      market: parsed.market ?? this.requestContext.getMarket(),
      locale: parsed.locale ?? this.requestContext.getLocale(),
      slug: parsed.path,
    });
    return result || {
      canonical_url: "",
      meta_description: "",
      meta_title: "",
      no_index: false,
    };
  }

  getSitemap() {
    const context = this.requestContext.requireContext();
    return SeoSitemapResponseSchema.parse({
      request_id: context.request_id,
      item: [],
    });
  }

  listRedirects() {
    this.authorization.requireStaffPermission("seo:read");
    return SeoRedirectListResponseSchema.parse([]);
  }

  upsertRedirect(body: unknown) {
    const actor = this.authorization.requireStaffPermission("seo:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(SeoRedirectCreateSchema, body);
    return SeoRedirectMutationResponseSchema.parse({
      request_id: context.request_id,
      item: {
        id: 1,
        from_path: input.from_path,
        to_path: input.to_path,
        status_code: input.status_code,
        market: input.market,
        locale: input.locale,
      },
    });
  }
}
