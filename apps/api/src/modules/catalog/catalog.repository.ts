import type { CatalogCategory, CatalogCategoryCreateInput, CatalogCategoryListQuery, CatalogProduct, CatalogProductCreateInput, CatalogProductListQuery, CatalogVariant } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");

export interface CatalogRepository {
  listCategories(query: CatalogCategoryListQuery): Promise<{ items: CatalogCategory[]; total: number; page: number; page_size: number }>;
  upsertCategory(input: CatalogCategoryCreateInput & { id?: number }): Promise<CatalogCategory>;
  listProducts(query: CatalogProductListQuery): Promise<{ items: CatalogProduct[]; total: number; page: number; page_size: number }>;
  getProductBySlug(slug: string): Promise<CatalogProduct | null>;
  upsertProduct(input: CatalogProductCreateInput & { id?: number; status?: string }): Promise<CatalogProduct>;
  listVariants(): Promise<CatalogVariant[]>;
  getVariantById(id: number): Promise<{ id: number; product_id: number; sku: string; options: unknown; specifications: unknown; status: string } | null>;
}
