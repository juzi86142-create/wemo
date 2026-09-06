import type {
  CatalogCategory,
  CatalogCategoryCreateInput,
  CatalogCategoryListQuery,
  CatalogProduct,
  CatalogProductCreateInput,
  CatalogProductListQuery,
  CatalogVariant,
} from "@wemo/contracts";

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CatalogRepository {
  listCategories(
    query: CatalogCategoryListQuery,
  ): Promise<Page<CatalogCategory>>;
  upsertCategory(
    input: CatalogCategoryCreateInput & { id?: number },
  ): Promise<CatalogCategory>;
  listProducts(query: CatalogProductListQuery): Promise<Page<CatalogProduct>>;
  getProductBySlug(slug: string): Promise<CatalogProduct | null>;
  getProductById(id: number): Promise<CatalogProduct | null>;
  upsertProduct(
    input: CatalogProductCreateInput & { id?: number; status?: string },
  ): Promise<CatalogProduct>;
  listVariants(): Promise<CatalogVariant[]>;
}
