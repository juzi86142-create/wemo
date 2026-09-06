import { Inject, Injectable } from "@nestjs/common";
import {
  SeoRedirectCreateSchema,
  SeoRedirectListResponseSchema,
  SeoRedirectMutationResponseSchema,
  SeoSitemapResponseSchema,
} from "@wemo/contracts/content";
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

  async getMetadata(query: unknown) {
    const parsed = parseInput(SeoMetadataQuerySchema, query);
    const result = await this.repository.getPageSeo({
      market: parsed.market ?? this.requestContext.getMarket(),
      locale: parsed.locale ?? this.requestContext.getLocale(),
      slug: parsed.path,
    });
    return (
      result || {
        canonical_url: "",
        meta_description: "",
        meta_title: "",
        no_index: false,
      }
    );
  }

  getSitemap() {
    const context = this.requestContext.requireContext();
    return SeoSitemapResponseSchema.parse({
      request_id: context.request_id,
      item: [],
    });
  }

  async listRedirects() {
    this.authorization.requireStaffPermission("seo:read");
    const items = await this.repository.listRedirects();
    return SeoRedirectListResponseSchema.parse(items);
  }

  async upsertRedirect(body: unknown) {
    this.authorization.requireStaffPermission("seo:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(SeoRedirectCreateSchema, body);
    const item = await this.repository.upsertRedirect(input);
    return SeoRedirectMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
