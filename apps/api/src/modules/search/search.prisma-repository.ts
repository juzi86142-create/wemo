import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type { SearchHit } from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  SEARCH_REPOSITORY,
  type SearchRepository,
  type SearchQuery,
  type SearchResponse,
  type SearchableItem,
} from "./search.repository";

/** 演示级搜索 产品名/短描述与分类名包含匹配 按契约 SearchHit 形状输出 */
@Injectable()
export class SearchPrismaRepository implements SearchRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const page = query.page;
    const pageSize = query.page_size;
    const type = query.type;
    const includeProducts = type === undefined || type === "product";
    const includeCategories = type === undefined || type === "category";
    const hits: SearchHit[] = [];

    if (includeProducts) {
      const translations = await this.database.productTranslation.findMany({
        where: {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
          ],
          ...(query.market !== undefined ? { market: query.market } : {}),
          ...(query.locale !== undefined ? { locale: query.locale } : {}),
        },
        take: page * pageSize,
        orderBy: { productId: "asc" },
      });

      const productIds = [...new Set(translations.map((t) => t.productId))];
      const products =
        productIds.length > 0
          ? await this.database.product.findMany({
              where: { id: { in: productIds }, status: "active" },
            })
          : [];
      const activeIds = new Set(products.map((p) => p.id));

      for (const translation of translations) {
        if (!activeIds.has(translation.productId)) continue;
        hits.push({
          entity_type: "product",
          entity_id: translation.productId,
          slug: translation.slug,
          title: translation.name,
          snippet: translation.shortDescription.slice(0, 100),
          url: `/products/${translation.slug}`,
          market: translation.market,
          locale: translation.locale,
          status: "active",
          score: 0,
          primary_image_url: null,
        });
      }
    }

    if (includeCategories) {
      const queryLower = query.q.toLowerCase();
      const categories = await this.database.category.findMany({
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
      });
      for (const category of categories) {
        if (
          !JSON.stringify(category.localizedContent)
            .toLowerCase()
            .includes(queryLower)
        ) {
          continue;
        }
        hits.push({
          entity_type: "category",
          entity_id: category.id,
          slug: category.slug,
          title: category.slug,
          snippet: "",
          url: `/products/${category.slug}`,
          market: query.market ?? "US",
          locale: query.locale ?? "en-US",
          status: "active",
          score: 0,
          primary_image_url: null,
        });
      }
    }

    const start = (page - 1) * pageSize;
    return {
      items: hits.slice(start, start + pageSize),
      total: hits.length,
      page,
      page_size: pageSize,
    };
  }

  async suggest(query: string, locale?: string): Promise<string[]> {
    const translations = await this.database.productTranslation.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        ...(locale !== undefined ? { locale } : {}),
      },
      take: 5,
      orderBy: { productId: "asc" },
    });

    return translations.map((t) => t.name);
  }

  async index(item: SearchableItem): Promise<void> {
    // 演示模式：无独立搜索引擎，索引请求仅记录日志
    console.log(`Indexing ${item.type}: ${item.id}`);
  }
}
