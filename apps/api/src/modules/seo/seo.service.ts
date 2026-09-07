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
      market: this.requestContext.getMarket(),
      locale: this.requestContext.getLocale(),
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

  async getSitemap() {
    const context = this.requestContext.requireContext();
    const entries = await this.repository.listSitemapEntries();
    return SeoSitemapResponseSchema.parse({
      request_id: context.request_id,
      item: entries,
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
