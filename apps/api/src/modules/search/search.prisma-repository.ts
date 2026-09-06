import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { SEARCH_REPOSITORY, type SearchRepository, type SearchQuery, type SearchResponse, type SearchableItem } from "./search.repository";

@Injectable()
export class SearchPrismaRepository implements SearchRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const page = query.page || 1;
    const page_size = query.page_size || 20;

    const [products, categories] = await Promise.all([
      this.database.product.findMany({
        where: {
          AND: [
            { status: "active" },
            {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } },
              ],
            },
          ],
        },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.database.category.findMany({
        where: {
          AND: [
            { status: "active" },
            {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } },
              ],
            },
          ],
        },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
    ]);

    const items = [
      ...products.map(p => ({
        id: `product:${p.id}`,
        type: "product" as const,
        title: p.name,
        snippet: p.description?.slice(0, 100) || "",
        score: 0,
        metadata: { id: p.id, slug: p.slug },
      })),
      ...categories.map(c => ({
        id: `category:${c.id}`,
        type: "category" as const,
        title: c.name,
        snippet: c.description?.slice(0, 100) || "",
        score: 0,
        metadata: { id: c.id, slug: c.slug },
      })),
    ];

    return {
      items,
      total: items.length,
      page,
      page_size,
    };
  }

  async suggest(query: string): Promise<string[]> {
    const products = await this.database.product.findMany({
      where: {
        AND: [
          { status: "active" },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { name: true },
    });

    return products.map(p => p.name);
  }

  async index(item: SearchableItem): Promise<void> {
    console.log(`Indexing ${item.type}: ${item.id}`);
  }
}
