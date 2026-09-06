import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { SEO_REPOSITORY, type SeoRepository } from "./seo.repository";
import type { SeoMetadata, SeoQuery, SeoResult } from "@wemo/contracts";

@Injectable()
export class SeoPrismaRepository implements SeoRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getPageSeo(query: SeoQuery): Promise<SeoResult | null> {
    const entry = await this.database.contentEntry.findFirst({
      where: {
        market: query.market,
        locale: query.locale,
        slug: query.slug,
        status: "published",
      },
    });

    if (!entry) return null;

    return {
      meta_title: entry.seo?.title || entry.title,
      meta_description: entry.seo?.description || "",
      keywords: entry.seo?.keywords || [],
      canonical_url: `/${entry.market}/${entry.locale}/${entry.slug}`,
    };
  }

  async savePageSeo(input: SeoMetadata): Promise<SeoMetadata> {
    const entry = await this.database.contentEntry.update({
      where: { id: input.id },
      data: {
        seo: {
          title: input.title,
          description: input.description,
          keywords: input.keywords,
        },
      },
    });

    return {
      id: entry.id,
      page_type: entry.type,
      page_id: entry.id.toString(),
      market: entry.market,
      locale: entry.locale,
      slug: entry.slug,
      title: entry.seo?.title || "",
      description: entry.seo?.description || "",
      keywords: entry.seo?.keywords || [],
      og_image: "",
      no_index: false,
    };
  }

  async listSeoPages(query: any): Promise<{ items: SeoMetadata[]; total: number; page: number; page_size: number }> {
    const [entries, total] = await Promise.all([
      this.database.contentEntry.findMany({
        where: {
          status: "published",
          seo: { not: {} },
        },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.contentEntry.count({
        where: { status: "published", seo: { not: {} } },
      }),
    ]);

    return {
      items: entries.map(e => ({
        id: e.id,
        page_type: e.type,
        page_id: e.id.toString(),
        market: e.market,
        locale: e.locale,
        slug: e.slug,
        title: e.seo?.title || "",
        description: e.seo?.description || "",
        keywords: e.seo?.keywords || [],
        og_image: "",
        no_index: false,
      })),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }
}
