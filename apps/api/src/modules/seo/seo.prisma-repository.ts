import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  SeoRedirect,
  SeoRedirectCreateInput,
  SeoSitemapEntry,
} from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  SEO_REPOSITORY,
  type SeoPageQuery,
  type SeoPageResult,
  type SeoRepository,
} from "./seo.repository";

function readSeoRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class SeoPrismaRepository implements SeoRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async getPageSeo(query: SeoPageQuery): Promise<SeoPageResult | null> {
    const entry = await this.database.contentEntry.findFirst({
      where: {
        market: query.market,
        locale: query.locale,
        slug: query.slug,
        status: "published",
      },
    });

    if (!entry) return null;

    const seo = readSeoRecord(entry.seo);
    return {
      meta_title:
        typeof seo.title === "string" && seo.title.length > 0
          ? seo.title
          : entry.title,
      meta_description:
        typeof seo.description === "string" ? seo.description : "",
      canonical_url:
        typeof seo.canonical_url === "string"
          ? seo.canonical_url
          : `/${entry.market}/${entry.locale}/${entry.slug}`,
      no_index:
        typeof seo.indexable === "boolean" ? !seo.indexable : false,
    };
  }

  async listRedirects(): Promise<SeoRedirect[]> {
    const rows = await this.database.redirect.findMany({
      orderBy: { id: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      source_path: row.sourcePath,
      target_path: row.targetPath,
      status_code: row.statusCode,
      created_at: row.createdAt.toISOString(),
      updated_at: row.createdAt.toISOString(),
    }));
  }

  async upsertRedirect(input: SeoRedirectCreateInput): Promise<SeoRedirect> {
    const existing = await this.database.redirect.findUnique({
      where: { sourcePath: input.source_path },
    });

    const row = existing
      ? await this.database.redirect.update({
          where: { id: existing.id },
          data: {
            targetPath: input.target_path,
            ...(input.status_code !== undefined
              ? { statusCode: input.status_code }
              : {}),
          },
        })
      : await this.database.redirect.create({
          data: {
            sourcePath: input.source_path,
            targetPath: input.target_path,
            statusCode: input.status_code ?? 301,
          },
        });

    return {
      id: row.id,
      source_path: row.sourcePath,
      target_path: row.targetPath,
      status_code: row.statusCode,
      created_at: row.createdAt.toISOString(),
      updated_at: row.createdAt.toISOString(),
    };
  }

  /** 站点地图真实条目 需求 SEO-004 仅收录已发布产品分类与内容 */
  async listSitemapEntries(): Promise<SeoSitemapEntry[]> {
    const [products, translations, categories, entries] = await Promise.all([
      this.database.product.findMany({ where: { status: "active" } }),
      this.database.productTranslation.findMany(),
      this.database.category.findMany({ where: { status: "active" } }),
      this.database.contentEntry.findMany({
        where: { status: { in: ["published", "scheduled"] } },
      }),
    ]);
    const productIds = new Set(products.map((product) => product.id));
    const baseUrl = process.env.STOREFRONT_URL ?? "http://localhost:3000";

    const productEntries = translations
      .filter(
        (translation) =>
          productIds.has(translation.productId) &&
          translation.translationStatus === "published",
      )
      .map((translation) => ({
        url: `${baseUrl}/${translation.market.toLowerCase()}/products/${translation.slug}`,
        lastmod: new Date().toISOString().slice(0, 10),
        locale: translation.locale,
        market: translation.market,
        changefreq: "weekly" as const,
        priority: 0.8,
      }));

    const categoryEntries = categories.map((category) => ({
      url: `${baseUrl}/categories/${category.slug}`,
      lastmod: new Date().toISOString().slice(0, 10),
      locale: "en-US",
      market: "US",
      changefreq: "weekly" as const,
      priority: 0.6,
    }));

    const contentEntries = entries
      .filter(
        (entry) =>
          entry.publishedAt === null || entry.publishedAt <= new Date(),
      )
      .map((entry) => ({
        url: `${baseUrl}/${entry.market.toLowerCase()}/${entry.locale.toLowerCase()}/${entry.slug}`,
        lastmod: entry.updatedAt.toISOString().slice(0, 10),
        locale: entry.locale,
        market: entry.market,
        changefreq: "monthly" as const,
        priority: 0.5,
      }));

    return [...productEntries, ...categoryEntries, ...contentEntries];
  }
}
