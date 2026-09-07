import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  CatalogCategory,
  CatalogCategoryCreateInput,
  CatalogCategoryListQuery,
  CatalogProduct,
  CatalogProductCreateInput,
  CatalogProductListQuery,
  CatalogVariant,
  JsonValue,
} from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  type Page,
  CATALOG_REPOSITORY,
  type CatalogRepository,
  type DealerCatalogBaseRow,
  type DealerCatalogContext,
} from "./catalog.repository";

type ProductRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["product"]["findFirst"]>>
>;
type TranslationRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["productTranslation"]["findFirst"]>>
>;
type VariantRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["variant"]["findFirst"]>>
>;

/** Prisma 写入端 Json 字段接受的值类型（与读取端输出的 JsonValue 不同源）。 */
type JsonWriteValue = Parameters<DatabaseClient["product"]["create"]>[0]["data"]["attributes"];

/** categories / variants 表没有时间戳列：写入端无来源，读取端兜底固定值。 */
const NO_TIMESTAMP_ISO = "1970-01-01T00:00:00.000Z";

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordLike)
    : null;
}

function readStringList(value: unknown, key: string): string[] {
  const record = asRecord(value);
  const raw = record?.[key];
  return Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
}

function readNumberList(value: unknown, key: string): number[] {
  const record = asRecord(value);
  const raw = record?.[key];
  return Array.isArray(raw)
    ? raw.filter((item): item is number => typeof item === "number")
    : [];
}

function readNullableString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  const raw = record?.[key];
  return typeof raw === "string" ? raw : null;
}

function hasAnyName(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) return false;
  for (const entry of Object.values(record)) {
    if (readNullableString(entry, "name") !== null) return true;
  }
  return false;
}

/** products.attributes Json 容器内约定的业务字段（表无独立列）。 */
interface ProductAttributes {
  tags: string[];
  primary_image_url: string | null;
  media_asset_ids: number[];
  related_product_ids: number[];
  category_ids: number[];
}

function readAttributes(value: unknown): ProductAttributes {
  return {
    tags: readStringList(value, "tags"),
    primary_image_url: readNullableString(value, "primary_image_url"),
    media_asset_ids: readNumberList(value, "media_asset_ids"),
    related_product_ids: readNumberList(value, "related_product_ids"),
    category_ids: readNumberList(value, "category_ids"),
  };
}

const PREFERRED_LOCALE_KEYS = ["en-US", "en", "zh-CN", "zh"];

function findNameInRecord(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of PREFERRED_LOCALE_KEYS) {
    const name = readNullableString(record[key], "name");
    if (name !== null) return name;
  }
  for (const entry of Object.values(record)) {
    const name = readNullableString(entry, "name");
    if (name !== null) return name;
  }
  return null;
}

function readDescription(translation: TranslationRow | undefined): string | null {
  if (!translation) return null;
  const raw = asRecord(translation.content)?.["description"];
  return typeof raw === "string" ? raw : null;
}

function toIso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

@Injectable()
export class CatalogPrismaRepository implements CatalogRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listCategories(
    query: CatalogCategoryListQuery,
  ): Promise<Page<CatalogCategory>> {
    const page = query.page;
    const pageSize = query.page_size;
    const where = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.parent_id !== undefined ? { parentId: query.parent_id } : {}),
    };

    const [categories, total] = await Promise.all([
      this.database.category.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: "asc" },
      }),
      this.database.category.count({ where }),
    ]);

    return {
      items: categories.map(category => this.mapCategory(category)),
      total,
      page,
      page_size: pageSize,
    };
  }

  async upsertCategory(
    input: CatalogCategoryCreateInput & { id?: number },
  ): Promise<CatalogCategory> {
    if (input.id !== undefined) {
      const existing = await this.database.category.findUnique({
        where: { id: input.id },
      });
      if (!existing) throw new NotFoundException(`category ${input.id} 不存在`);
      const updated = await this.database.category.update({
        where: { id: input.id },
        data: {
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.parent_id !== undefined ? { parentId: input.parent_id } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
          localizedContent: this.mergeCategoryContent(
            existing.localizedContent,
            input.localized_content ?? {},
            input.name,
          ) as JsonWriteValue,
        },
      });
      return this.mapCategory(updated);
    }

    const created = await this.database.category.create({
      data: {
        slug: input.slug,
        parentId: input.parent_id ?? null,
        status: input.status ?? "active",
        sortOrder: input.sort_order ?? 0,
        localizedContent: this.mergeCategoryContent(
          {},
          input.localized_content ?? {},
          input.name,
        ) as JsonWriteValue,
      },
    });
    return this.mapCategory(created);
  }

  async listProducts(
    query: CatalogProductListQuery,
    context: { market: string; locale: string },
  ): Promise<Page<CatalogProduct>> {
    const page = query.page;
    const pageSize = query.page_size;
    const where = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.category_id !== undefined
        ? { primaryCategoryId: query.category_id }
        : {}),
      // 年龄筛选 需求 PLP-002
      ...(query.age !== undefined
        ? { ageMin: { lte: query.age }, ageMax: { gte: query.age } }
        : {}),
      // 场景与技能来自 attributes Json 需求 PLP-002
      ...(query.environment !== undefined
        ? {
            attributes: {
              path: ["play_environment"],
              array_contains: query.environment,
            },
          }
        : {}),
      ...(query.skill !== undefined
        ? { attributes: { path: ["skills"], array_contains: query.skill } }
        : {}),
    };

    // 价格排序需要先取全部候选再按价格排序分页 需求 PLP-003
    const priceSort = query.sort === "price_asc" || query.sort === "price_desc";
    const [products, total] = await Promise.all([
      this.database.product.findMany({
        where,
        ...(priceSort ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        orderBy: {
          ...(query.sort === "newest" || query.sort === undefined
            ? { createdAt: "desc" as const }
            : {}),
          ...(query.sort === "featured" ? { publishedAt: "desc" as const } : {}),
        },
      }),
      this.database.product.count({ where }),
    ]);

    const items = await this.assembleProducts(products, context);
    const sorted = await this.sortProducts(items, query.sort);
    return {
      items: priceSort
        ? sorted.slice((page - 1) * pageSize, page * pageSize)
        : sorted,
      total,
      page,
      page_size: pageSize,
    };
  }

  /** 名称与价格排序在装配结果上执行 需求 PLP-003 */
  private async sortProducts(
    products: CatalogProduct[],
    sort: CatalogProductListQuery["sort"],
  ): Promise<CatalogProduct[]> {
    if (sort === "name_asc" || sort === "name_desc") {
      return [...products].sort((a, b) =>
        sort === "name_asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      );
    }
    if (sort === "price_asc" || sort === "price_desc") {
      const variantIds = products.flatMap((product) =>
        product.variants.map((variant) => variant.id),
      );
      const prices =
        variantIds.length > 0
          ? await this.database.price.findMany({
              where: { variantId: { in: variantIds } },
            })
          : [];
      const priceByVariant = new Map(
        prices.map((price) => [price.variantId, price.amountMinor]),
      );
      const lowestPrice = (product: CatalogProduct): number =>
        Math.min(
          ...product.variants.map(
            (variant) => priceByVariant.get(variant.id) ?? Number.MAX_SAFE_INTEGER,
          ),
        );
      return [...products].sort((a, b) =>
        sort === "price_asc"
          ? lowestPrice(a) - lowestPrice(b)
          : lowestPrice(b) - lowestPrice(a),
      );
    }
    return products;
  }

  async getProductBySlug(slug: string): Promise<CatalogProduct | null> {
    // slug 只在 product_translations 按 (market, locale, slug) 唯一，这里取任意一条后回查产品。
    const translation = await this.database.productTranslation.findFirst({
      where: { slug },
      orderBy: [{ market: "asc" }, { locale: "asc" }],
    });
    if (!translation) return null;
    const product = await this.database.product.findUnique({
      where: { id: translation.productId },
    });
    if (!product) return null;
    const [loaded] = await this.assembleProducts([product]);
    return loaded ?? null;
  }

  async getProductById(id: number): Promise<CatalogProduct | null> {
    const product = await this.database.product.findUnique({ where: { id } });
    if (!product) return null;
    const [loaded] = await this.assembleProducts([product]);
    return loaded ?? null;
  }

  async upsertProduct(
    input: CatalogProductCreateInput & { id?: number; status?: string },
  ): Promise<CatalogProduct> {
    const id = input.id;
    const existing =
      id !== undefined
        ? await this.database.product.findUnique({ where: { id } })
        : null;
    if (id !== undefined && !existing) {
      throw new NotFoundException(`product ${id} 不存在`);
    }

    // 1) 写 products 主行（attributes 容器承载无独立列的字段）
    const attributes = this.buildAttributes(existing, input);
    const product =
      existing === null
        ? await this.database.product.create({
            data: {
              primaryCategoryId: input.primary_category_id,
              status: input.status ?? "draft",
              ageMin: input.age_min ?? null,
              ageMax: input.age_max ?? null,
              attributes: attributes as JsonWriteValue,
              marketVisibility: (input.market_visibility ?? {}) as JsonWriteValue,
            },
          })
        : await this.database.product.update({
            where: { id: existing.id },
            data: {
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.primary_category_id !== undefined
                ? { primaryCategoryId: input.primary_category_id }
                : {}),
              ...(input.age_min !== undefined ? { ageMin: input.age_min } : {}),
              ...(input.age_max !== undefined ? { ageMax: input.age_max } : {}),
              attributes: attributes as JsonWriteValue,
              ...(input.market_visibility !== undefined
                ? { marketVisibility: input.market_visibility as JsonWriteValue }
                : {}),
            },
          });

    // 2) 同步 product_translations（先读后整表重建，行内 slug/name/short_description/content 见 syncTranslations）
    const existingTranslations = existing
      ? await this.database.productTranslation.findMany({
          where: { productId: existing.id },
        })
      : [];
    await this.syncTranslations(product.id, existingTranslations, input);

    // 3) 同步 variants：有 id 的按 sku upsert，无 id 的新建；input 未带 variants 时保持不变
    if (input.variants) {
      for (const variant of input.variants) {
        await this.upsertVariant(product.id, variant);
      }
    }

    const [loaded] = await this.assembleProducts([product]);
    if (!loaded) {
      throw new NotFoundException(`product ${product.id} 装配失败`);
    }
    return loaded;
  }

  async listVariants(): Promise<CatalogVariant[]> {
    const variants = await this.database.variant.findMany({
      orderBy: [{ productId: "asc" }, { sku: "asc" }],
    });
    const productIds = [...new Set(variants.map(variant => variant.productId))];
    const products =
      productIds.length > 0
        ? await this.database.product.findMany({
            where: { id: { in: productIds } },
          })
        : [];
    const productById = new Map(products.map(product => [product.id, product]));
    return variants.map(variant => this.mapVariant(variant, productById.get(variant.productId)));
  }

  // ---------- 映射 ----------

  private mapCategory(category: NonNullable<Awaited<ReturnType<DatabaseClient["category"]["findFirst"]>>>): CatalogCategory {
    return {
      id: category.id,
      parent_id: category.parentId,
      slug: category.slug,
      name: findNameInRecord(category.localizedContent) ?? category.slug,
      status: category.status,
      sort_order: category.sortOrder,
      localized_content: category.localizedContent as CatalogCategory["localized_content"],
      created_at: NO_TIMESTAMP_ISO,
      updated_at: NO_TIMESTAMP_ISO,
    };
  }

  /**
   * 产品名称类字段来自 product_translations：
   * - 优先命中请求的 market/locale，其次仅 market、仅 locale，最后按 (market, locale) 排序取第一条；
   * - description 读取翻译行 content Json 的 description 键。
   */
  private pickTranslation(
    translations: TranslationRow[],
    preferred?: { market?: string; locale?: string },
  ): TranslationRow | undefined {
    if (translations.length === 0) return undefined;
    const sorted = [...translations].sort((a, b) => {
      const byMarket = a.market.localeCompare(b.market);
      return byMarket !== 0 ? byMarket : a.locale.localeCompare(b.locale);
    });
    const matchLocale =
      preferred?.market !== undefined && preferred?.locale !== undefined
        ? sorted.find(
            row =>
              row.market === preferred.market && row.locale === preferred.locale,
          )
        : undefined;
    const matchMarket =
      preferred?.market !== undefined
        ? sorted.find(row => row.market === preferred.market)
        : undefined;
    const matchOnlyLocale =
      preferred?.locale !== undefined
        ? sorted.find(row => row.locale === preferred.locale)
        : undefined;
    return matchLocale ?? matchMarket ?? matchOnlyLocale ?? sorted[0];
  }

  private buildLocalizedContent(translations: TranslationRow[]): JsonValue {
    const record: RecordLike = {};
    for (const translation of translations) {
      record[`${translation.market}:${translation.locale}`] = {
        market: translation.market,
        locale: translation.locale,
        slug: translation.slug,
        name: translation.name,
        short_description: translation.shortDescription,
        description: readDescription(translation),
        translation_status: translation.translationStatus,
        content: translation.content,
      };
    }
    return record as JsonValue;
  }

  private mapProduct(
    product: ProductRow,
    translations: TranslationRow[],
    variants: VariantRow[],
    preferred?: { market?: string; locale?: string },
  ): CatalogProduct {
    const translation = this.pickTranslation(translations, preferred);
    const attributes = readAttributes(product.attributes);
    const createdAt = product.createdAt.toISOString();
    const categoryIds = [
      ...new Set([product.primaryCategoryId, ...attributes.category_ids]),
    ];
    return {
      id: product.id,
      slug: translation?.slug ?? `product-${product.id}`,
      name: translation?.name ?? `product-${product.id}`,
      short_description: translation?.shortDescription ?? "",
      description: readDescription(translation),
      age_min: product.ageMin,
      age_max: product.ageMax,
      tags: attributes.tags,
      primary_image_url: attributes.primary_image_url,
      status: product.status as CatalogProduct["status"],
      primary_category_id: product.primaryCategoryId,
      category_ids: categoryIds,
      market_visibility: product.marketVisibility as CatalogProduct["market_visibility"],
      localized_content: this.buildLocalizedContent(translations),
      media_asset_ids: attributes.media_asset_ids,
      related_product_ids: attributes.related_product_ids,
      variants: variants.map(variant => this.mapVariant(variant, product)),
      published_at: toIso(product.publishedAt),
      archived_at: toIso(product.archivedAt),
      created_at: createdAt,
      // products 表没有 updated_at 列，读取侧用 created_at 兜底。
      updated_at: createdAt,
    };
  }

  private mapVariant(
    variant: VariantRow,
    product: ProductRow | undefined,
  ): CatalogVariant {
    const timestamp = product?.createdAt
      ? product.createdAt.toISOString()
      : NO_TIMESTAMP_ISO;
    return {
      id: variant.id,
      product_id: variant.productId,
      sku: variant.sku,
      barcode: variant.barcode,
      options: variant.options as CatalogVariant["options"],
      specifications: variant.specifications as CatalogVariant["specifications"],
      status: variant.status,
      primary_image_url: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  // ---------- 装配与写入 ----------

  /** 按产品 id 批量补查 translations 与 variants 后映射（无 include，三表各自查询）。 */
  private async assembleProducts(
    products: ProductRow[],
    preferred?: { market?: string; locale?: string },
  ): Promise<CatalogProduct[]> {
    if (products.length === 0) return [];
    const ids = products.map(product => product.id);
    const [translations, variants] = await Promise.all([
      this.database.productTranslation.findMany({
        where: { productId: { in: ids } },
        orderBy: [{ market: "asc" }, { locale: "asc" }],
      }),
      this.database.variant.findMany({
        where: { productId: { in: ids } },
        orderBy: { id: "asc" },
      }),
    ]);
    const translationByProduct = new Map<number, TranslationRow[]>();
    for (const translation of translations) {
      const bucket = translationByProduct.get(translation.productId);
      if (bucket) bucket.push(translation);
      else translationByProduct.set(translation.productId, [translation]);
    }
    const variantByProduct = new Map<number, VariantRow[]>();
    for (const variant of variants) {
      const bucket = variantByProduct.get(variant.productId);
      if (bucket) bucket.push(variant);
      else variantByProduct.set(variant.productId, [variant]);
    }
    return products.map(product =>
      this.mapProduct(
        product,
        translationByProduct.get(product.id) ?? [],
        variantByProduct.get(product.id) ?? [],
        preferred,
      ),
    );
  }

  /** 合并分类多语言内容：新键覆盖旧键；只给了 name 且没有任何语言含 name 时落到 "en-US"。 */
  private mergeCategoryContent(
    existing: unknown,
    incoming: unknown,
    topLevelName: string | undefined,
  ): RecordLike {
    const merged: RecordLike = {
      ...(asRecord(existing) ?? {}),
      ...(asRecord(incoming) ?? {}),
    };
    if (topLevelName !== undefined && !hasAnyName(merged)) {
      merged["en-US"] = { name: topLevelName };
    }
    return merged;
  }

  /** attributes 容器：create 时全量写入，update 时缺失字段回落 existing，显式 null 表示清空。 */
  private buildAttributes(
    existing: ProductRow | null,
    input: CatalogProductCreateInput & { id?: number; status?: string },
  ): RecordLike {
    const current = existing ? readAttributes(existing.attributes) : undefined;
    const merged: ProductAttributes = {
      tags:
        input.tags !== undefined ? input.tags : (current?.tags ?? []),
      primary_image_url:
        input.primary_image_url !== undefined
          ? (input.primary_image_url ?? null)
          : (current?.primary_image_url ?? null),
      media_asset_ids:
        input.media_asset_ids !== undefined
          ? input.media_asset_ids
          : (current?.media_asset_ids ?? []),
      related_product_ids:
        input.related_product_ids !== undefined
          ? input.related_product_ids
          : (current?.related_product_ids ?? []),
      category_ids:
        input.category_ids !== undefined
          ? input.category_ids
          : (current?.category_ids ?? []),
    };
    return { ...merged };
  }

  /**
   * 将产品翻译“整表重建”：删除旧行后按（旧内容 + 输入增量）合并写回。
   * 输入形状约定与读取侧 buildLocalizedContent 一致：键为 "market:locale"。
   * create 时无 local content 则用顶层 name/slug/short_description/description 生成默认行（US/en-US）。
   */
  private async syncTranslations(
    productId: number,
    existingTranslations: TranslationRow[],
    input: CatalogProductCreateInput & { id?: number; status?: string },
  ): Promise<void> {
    const localeMap = new Map<string, RecordLike>();
    for (const row of existingTranslations) {
      localeMap.set(`${row.market}:${row.locale}`, {
        market: row.market,
        locale: row.locale,
        slug: row.slug,
        name: row.name,
        short_description: row.shortDescription,
        translation_status: row.translationStatus,
        content: (asRecord(row.content) ?? {}) as RecordLike,
      });
    }
    for (const [key, value] of Object.entries(asRecord(input.localized_content ?? {}) ?? {})) {
      const entry = asRecord(value);
      if (!entry || !key.includes(":")) continue;
      const previous = localeMap.get(key) ?? {};
      localeMap.set(key, {
        ...previous,
        ...entry,
        market: key.split(":")[0],
        locale: key.slice(key.indexOf(":") + 1),
      });
    }

    const rows: Array<{
      market: string;
      locale: string;
      slug: string;
      name: string;
      shortDescription: string;
      content: RecordLike;
      translationStatus: string;
    }> = [...localeMap.entries()].map(([key, entry]) => {
      const market = key.split(":")[0] ?? "";
      const locale = key.slice(key.indexOf(":") + 1);
      const description =
        input.description !== undefined
          ? (input.description ?? null)
          : (readNullableString(entry["content"], "description") ?? null);
      const content =
        entry["content"] !== undefined && asRecord(entry["content"]) !== null
          ? ({ ...(asRecord(entry["content"]) ?? {}) } as RecordLike)
          : {};
      content["description"] = description;
      return {
        market,
        locale,
        slug: (readNullableString(entry, "slug") ?? input.slug) ?? `${market}:${locale}:${productId}`,
        name: (readNullableString(entry, "name") ?? input.name) ?? `product-${productId}`,
        shortDescription:
          (readNullableString(entry, "short_description") ??
            input.short_description ??
            "") as string,
        content,
        translationStatus:
          (readNullableString(entry, "translation_status") ??
            "not_started") as string,
      };
    });

    if (rows.length === 0 && input.name) {
      rows.push({
        market: "US",
        locale: "en-US",
        slug: input.slug ?? `product-${productId}`,
        name: input.name,
        shortDescription: input.short_description ?? "",
        content: { description: input.description ?? null },
        translationStatus: "not_started",
      });
    }

    if (rows.length === 0) return;
    await this.database.productTranslation.deleteMany({ where: { productId } });
    await this.database.productTranslation.createMany({ data: rows.map(row => ({
      productId,
      market: row.market,
      locale: row.locale,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription,
      content: row.content as JsonWriteValue,
      translationStatus: row.translationStatus,
    })) });
  }

  private async upsertVariant(
    productId: number,
    input: NonNullable<CatalogProductCreateInput["variants"]>[number],
  ): Promise<void> {
    const existing = await this.database.variant.findFirst({
      where: { productId, sku: input.sku },
    });
    const data = {
      sku: input.sku,
      barcode: input.barcode ?? null,
      options: (input.options ?? {}) as JsonWriteValue,
      specifications: (input.specifications ?? {}) as JsonWriteValue,
      status: input.status,
    };
    if (existing) {
      await this.database.variant.update({ where: { id: existing.id }, data });
    } else {
      await this.database.variant.create({ data: { productId, ...data } });
    }
  }

  async getDealerCatalogContext(
    companyId: number,
  ): Promise<DealerCatalogContext | null> {
    const company = await this.database.dealerCompany.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return null;
    }
    const terms = asRecord(company.terms) ?? {};
    return {
      tier_id: company.tierId,
      price_list_id: company.priceListId,
      currency: company.currency,
      authorized_category_slugs: readStringList(terms, "authorized_categories"),
    };
  }

  async listDealerCatalogBase(options: {
    market: string;
    locale: string;
    categorySlugs: string[];
  }): Promise<DealerCatalogBaseRow[]> {
    const categoryWhere =
      options.categorySlugs.length > 0
        ? { slug: { in: options.categorySlugs } }
        : {};
    const categories = await this.database.category.findMany({
      where: categoryWhere as never,
    });
    const categoryIds = categories.map((category) => category.id);

    const products = await this.database.product.findMany({
      where: {
        status: "active",
        ...(categoryIds.length > 0
          ? { primaryCategoryId: { in: categoryIds } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (products.length === 0) {
      return [];
    }
    const productIds = products.map((product) => product.id);

    const [translations, variants] = await Promise.all([
      this.database.productTranslation.findMany({
        where: { productId: { in: productIds } },
      }),
      this.database.variant.findMany({
        where: { productId: { in: productIds }, status: "active" },
      }),
    ]);

    const translationByProduct = new Map<number, TranslationRow>();
    for (const translation of translations) {
      const existing = translationByProduct.get(translation.productId);
      if (existing) continue;
      if (
        translation.market === options.market &&
        translation.locale === options.locale
      ) {
        translationByProduct.set(translation.productId, translation);
      }
    }
    for (const translation of translations) {
      if (!translationByProduct.has(translation.productId)) {
        translationByProduct.set(translation.productId, translation);
      }
    }

    return products.flatMap((product) => {
      const translation = translationByProduct.get(product.id);
      return variants
        .filter((variant) => variant.productId === product.id)
        .map((variant) => ({
          product_id: product.id,
          slug: translation?.slug ?? `product-${product.id}`,
          name: translation?.name ?? `Product ${product.id}`,
          category_id: product.primaryCategoryId,
          variant_id: variant.id,
          sku: variant.sku,
          specifications: variant.specifications,
        }));
    });
  }

  async getAvailableStock(
    variantIds: number[],
    market: string,
  ): Promise<Map<number, number>> {
    const balances = await this.database.inventoryBalance.findMany({
      where: { variantId: { in: variantIds }, market },
    });
    const stockByVariant = new Map<number, number>();
    for (const balance of balances) {
      stockByVariant.set(
        balance.variantId,
        (stockByVariant.get(balance.variantId) ?? 0) + balance.available,
      );
    }
    return stockByVariant;
  }

  async getVariantBySku(sku: string): Promise<DealerCatalogBaseRow | null> {
    const variant = await this.database.variant.findFirst({
      where: { sku, status: "active" },
    });
    if (!variant) {
      return null;
    }
    const product = await this.database.product.findUnique({
      where: { id: variant.productId },
    });
    if (!product || product.status !== "active") {
      return null;
    }
    const translation = await this.database.productTranslation.findFirst({
      where: { productId: product.id },
    });
    return {
      product_id: product.id,
      slug: translation?.slug ?? `product-${product.id}`,
      name: translation?.name ?? `Product ${product.id}`,
      category_id: product.primaryCategoryId,
      variant_id: variant.id,
      sku: variant.sku,
      specifications: variant.specifications,
    };
  }
}
