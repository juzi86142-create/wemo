import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  SEARCH_REPOSITORY,
  type SearchRepository,
  type SearchQuery,
  type SearchResponse,
  type SearchableItem,
} from "./search.repository";

@Injectable()
export class SearchPrismaRepository implements SearchRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const page = query.page || 1;
    const pageSize = query.page_size || 20;

    // 产品名/短描述在 product_translations 表；分类名在 categories.localized_content Json。
    const [translations, categories] = await Promise.all([
      this.database.productTranslation.findMany({
        where: {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { productId: "asc" },
      }),
      this.database.category.findMany({
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const productIds = [...new Set(translations.map((t) => t.productId))];
    const products =
      productIds.length > 0
        ? await this.database.product.findMany({
            where: { id: { in: productIds }, status: "active" },
          })
        : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    const productByTranslation = new Map(
      translations.map((t) => [t.productId, t]),
    );

    const productItems = translations
      .filter((t) => productById.get(t.productId)?.status === "active")
      .map((t) => ({
        id: `product:${t.productId}`,
        type: "product" as const,
        title: t.name,
        snippet: t.shortDescription.slice(0, 100),
        score: 0,
        metadata: { id: t.productId, slug: t.slug, market: t.market },
      }));

    const queryLower = query.q.toLowerCase();
    const categoryItems = categories
      .filter((c) => JSON.stringify(c.localizedContent).toLowerCase().includes(queryLower))
      .slice(0, pageSize)
      .map((c) => ({
        id: `category:${c.id}`,
        type: "category" as const,
        title: c.slug,
        snippet: "",
        score: 0,
        metadata: { id: c.id, slug: c.slug },
      }));

    const items = [...productItems, ...categoryItems];

    return {
      items,
      total: items.length,
      page,
      page_size: pageSize,
    };
  }

  async suggest(query: string): Promise<string[]> {
    const translations = await this.database.productTranslation.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
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
