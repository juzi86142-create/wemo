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

/** 经销商目录基础行 由 service 叠加价格与库存档位 */
export interface DealerCatalogBaseRow {
  product_id: number;
  slug: string;
  name: string;
  category_id: number;
  variant_id: number;
  sku: string;
  specifications: unknown;
}

export interface DealerCatalogContext {
  tier_id: number | null;
  price_list_id: number | null;
  currency: string;
  authorized_category_slugs: string[];
}

export interface CatalogRepository {
  listCategories(
    query: CatalogCategoryListQuery,
  ): Promise<Page<CatalogCategory>>;
  upsertCategory(
    input: CatalogCategoryCreateInput & { id?: number },
  ): Promise<CatalogCategory>;
  listProducts(
    query: CatalogProductListQuery,
    context: { market: string; locale: string },
  ): Promise<Page<CatalogProduct>>;
  getProductBySlug(slug: string): Promise<CatalogProduct | null>;
  getProductById(id: number): Promise<CatalogProduct | null>;
  upsertProduct(
    input: CatalogProductCreateInput & { id?: number; status?: string },
  ): Promise<CatalogProduct>;
  listVariants(): Promise<CatalogVariant[]>;
  getDealerCatalogContext(companyId: number): Promise<DealerCatalogContext | null>;
  listDealerCatalogBase(options: {
    market: string;
    locale: string;
    categorySlugs: string[];
  }): Promise<DealerCatalogBaseRow[]>;
  getAvailableStock(
    variantIds: number[],
    market: string,
  ): Promise<Map<number, number>>;
  getVariantBySku(sku: string): Promise<DealerCatalogBaseRow | null>;
}
