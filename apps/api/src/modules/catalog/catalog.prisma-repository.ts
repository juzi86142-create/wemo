import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { CATALOG_REPOSITORY, type CatalogRepository } from "./catalog.repository";
import type { CatalogCategory, CatalogProduct } from "@wemo/contracts";

@Injectable()
export class CatalogPrismaRepository implements CatalogRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listCategories(query: any): Promise<{ items: CatalogCategory[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.parent_id !== undefined) where.parentId = query.parent_id;

    const [categories, total] = await Promise.all([
      this.database.category.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { sortOrder: "asc" },
      }),
      this.database.category.count({ where }),
    ]);

    return {
      items: categories.map(c => this.mapCategory(c)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async upsertCategory(input: any): Promise<CatalogCategory> {
    const category = await this.database.category.upsert({
      where: { id: input.id ?? 0 },
      create: {
        slug: input.slug,
        parentId: input.parent_id ?? null,
        status: input.status ?? "active",
        sortOrder: input.sort_order ?? 0,
        localizedContent: input.localized_content ?? {},
      },
      update: {
        slug: input.slug,
        parentId: input.parent_id ?? undefined,
        status: input.status,
        sortOrder: input.sort_order,
        localizedContent: input.localized_content,
      },
    });

    return this.mapCategory(category);
  }

  async listProducts(query: any): Promise<{ items: CatalogProduct[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category_id) where.primaryCategoryId = query.category_id;

    const [products, total] = await Promise.all([
      this.database.product.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: {
          translations: true,
          variants: true,
          category: { select: { slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.database.product.count({ where }),
    ]);

    return {
      items: products.map(p => this.mapProduct(p)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getProductBySlug(slug: string): Promise<CatalogProduct | null> {
    const product = await this.database.product.findUnique({
      where: { slug },
      include: {
        translations: true,
        variants: true,
        category: { select: { slug: true, name: true } },
      },
    });

    if (!product) return null;

    return this.mapProduct(product);
  }

  async upsertProduct(input: any): Promise<CatalogProduct> {
    const product = await this.database.product.upsert({
      where: { id: input.id ?? 0 },
      create: {
        slug: input.slug,
        name: input.name,
        shortDescription: input.short_description,
        description: input.description,
        status: input.status ?? "draft",
        primaryCategoryId: input.primary_category_id,
        ageMin: input.age_min,
        ageMax: input.age_max,
        attributes: input.attributes ?? {},
        marketVisibility: input.market_visibility ?? {},
        localizedContent: input.localized_content ?? {},
      },
      update: {
        name: input.name,
        status: input.status,
        slug: input.slug,
        shortDescription: input.short_description,
        description: input.description,
        primaryCategoryId: input.primary_category_id,
        ageMin: input.age_min,
        ageMax: input.age_max,
        attributes: input.attributes,
        marketVisibility: input.market_visibility,
        localizedContent: input.localized_content,
      },
      include: {
        translations: true,
        variants: true,
      },
    });

    return this.mapProduct(product);
  }

  async listVariants(): Promise<any[]> {
    const variants = await this.database.variant.findMany({
      include: {
        product: { select: { slug: true, name: true } },
      },
    });

    return variants.map(v => ({
      id: v.id,
      product_id: v.productId,
      sku: v.sku,
      barcode: v.barcode,
      options: v.options,
      specifications: v.specifications,
      status: v.status,
    }));
  }

  async getVariantById(id: number): Promise<any | null> {
    const variant = await this.database.variant.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    if (!variant) return null;

    return {
      id: variant.id,
      product_id: variant.productId,
      sku: variant.sku,
      barcode: variant.barcode,
      options: variant.options,
      specifications: variant.specifications,
      status: variant.status,
    };
  }

  private mapCategory(category: any): CatalogCategory {
    return {
      id: category.id,
      parent_id: category.parentId,
      slug: category.slug,
      name: category.localizedContent?.["en-US"]?.name || category.slug,
      status: category.status,
      sort_order: category.sortOrder,
      localized_content: category.localizedContent,
      created_at: category.createdAt.toISOString(),
      updated_at: category.updatedAt.toISOString(),
    };
  }

  private mapProduct(product: any): CatalogProduct {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      short_description: product.shortDescription,
      description: product.description,
      status: product.status,
      primary_category_id: product.primaryCategoryId,
      category_ids: [product.primaryCategoryId],
      market_visibility: product.marketVisibility,
      localized_content: product.localizedContent,
      media_asset_ids: product.mediaAssetIds || [],
      related_product_ids: product.relatedProductIds || [],
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        options: v.options,
        specifications: v.specifications,
        status: v.status,
      })) || [],
      created_at: product.createdAt.toISOString(),
      archived_at: product.archivedAt?.toISOString() || null,
    };
  }
}
