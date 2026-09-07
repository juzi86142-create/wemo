import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../database/database.constants";
import type { JsonValue } from "@wemo/contracts/common";
import type {
  CatalogCategory, CatalogCategoryCreateInput, CatalogCategoryListQuery,
  CatalogProduct, CatalogProductCreateInput, CatalogProductListQuery,
  CatalogProductUpdateInput, CatalogVariant,
} from "@wemo/contracts/catalog";
import type {
  ContentEntry, ContentEntryCreateInput, ContentEntryListQuery,
  ContentEntryUpdateInput, ContentNavigation, FormSubmission,
  FormSubmissionCreateInput, FormSubmissionListQuery, FormSubmissionUpdateInput,
  LocalizationLocale, LocalizationMarket, LocalizationRoute, MediaAsset,
  MediaAssetCreateInput, MediaAssetListQuery, NotificationDelivery,
  NotificationDeliveryCreateInput, NotificationDeliveryListQuery,
  NotificationTemplate, NotificationTemplateCreateInput,
  NotificationTemplateUpdateInput, SearchHit, SearchQuery, SeoRedirect,
  SeoRedirectCreateInput, SeoSitemapEntry,
} from "@wemo/contracts/content";

/** Database-backed repository for catalog, content and experience data. */
@Injectable()
export class ExperienceRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  private page<T>(items: T[], page = 1, pageSize = 20) {
    return { items, page, page_size: pageSize, total: items.length };
  }
  private iso(value: Date | null | undefined): string | null { return value ? value.toISOString() : null; }
  private obj(value: unknown): Record<string, any> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
  }
  private arr<T = any>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }

  async listMarkets(): Promise<{ items: LocalizationMarket[]; page: number; page_size: number; total: number }> {
    const rows = await this.db.market.findMany({ where: { status: "active" }, orderBy: { code: "asc" } });
    return this.page(rows.map((row) => {
      const settings = this.obj(row.settings);
      return { code: row.code, default_locale: row.defaultLocale, currency: row.currency,
        timezone: row.timezone, fallback_locales: this.arr<string>(settings.fallback_locales ?? [row.defaultLocale]), status: row.status };
    }));
  }
  async listLocales(): Promise<{ items: LocalizationLocale[]; page: number; page_size: number; total: number }> {
    const rows = await this.db.marketLocale.findMany({ where: { status: "active" }, orderBy: [{ locale: "asc" }, { id: "asc" }] });
    const markets = await this.db.market.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.marketId))] } } });
    const languages = await this.db.language.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.languageId))] } } });
    const marketById = new Map(markets.map((r) => [r.id, r]));
    const languageById = new Map(languages.map((r) => [r.id, r]));
    return this.page(rows.map((row) => ({ code: row.locale, name: languageById.get(row.languageId)?.label ?? row.locale,
      market: marketById.get(row.marketId)?.code ?? "global", direction: "ltr", fallback_locale: null, status: row.status })));
  }
  async listRoutes(): Promise<{ items: LocalizationRoute[]; page: number; page_size: number; total: number }> {
    const rows = await this.db.marketLocale.findMany({ where: { status: "active" }, orderBy: [{ marketId: "asc" }, { sortOrder: "asc" }, { id: "asc" }] });
    const markets = await this.db.market.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.marketId))] } } });
    const byId = new Map(markets.map((r) => [r.id, r]));
    return this.page(rows.map((row) => {
      const market = byId.get(row.marketId); const settings = this.obj(market?.settings);
      return { market: market?.code ?? "global", locale: row.locale, prefix: row.pathPrefix, default: row.isDefault,
        fallback_chain: this.arr<string>(settings.fallback_locales ?? [row.locale]) };
    }));
  }

  private async categoryDto(row: any): Promise<CatalogCategory> {
    const localized = this.obj(row.localizedContent);
    return { id: row.id, parent_id: row.parentId ?? null, slug: row.slug,
      name: row.name || this.obj(localized["en-US"]).name || row.slug, status: row.status,
      sort_order: row.sortOrder, localized_content: localized as JsonValue,
      created_at: (row.createdAt ?? new Date()).toISOString(),
      updated_at: (row.updatedAt ?? row.createdAt ?? new Date()).toISOString() };
  }
  async listCategories(query: CatalogCategoryListQuery): Promise<{ items: CatalogCategory[]; page: number; page_size: number; total: number }> {
    const where: any = { ...(query.parent_id === undefined ? {} : { parentId: query.parent_id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ slug: { contains: query.q, mode: "insensitive" } }, { name: { contains: query.q, mode: "insensitive" } }] } : {}) };
    const [rows, total] = await Promise.all([
      this.db.category.findMany({ where, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.db.category.count({ where }),
    ]);
    return { items: await Promise.all(rows.map((r) => this.categoryDto(r))), page: query.page, page_size: query.page_size, total };
  }
  async upsertCategory(input: CatalogCategoryCreateInput & { id?: number }): Promise<CatalogCategory> {
    const localized = input.localized_content ?? {};
    const data: any = { parentId: input.parent_id ?? null, slug: input.slug,
      name: input.name ?? this.obj(localized)["en-US"]?.name ?? input.slug,
      status: input.status ?? "active", sortOrder: input.sort_order ?? 0, localizedContent: localized };
    let row: any;
    if (input.id) {
      if (!await this.db.category.findUnique({ where: { id: input.id } })) throw new NotFoundException("分类不存在");
      row = await this.db.category.update({ where: { id: input.id }, data });
    } else {
      try { row = await this.db.category.create({ data }); } catch { throw new ConflictException("分类 slug 已存在"); }
    }
    return this.categoryDto(row);
  }

  private async variantsFor(productIds?: number[]): Promise<CatalogVariant[]> {
    const rows = await this.db.variant.findMany({ ...(productIds ? { where: { productId: { in: productIds } } } : {}), orderBy: { id: "asc" } });
    return rows.map((row) => ({ id: row.id, product_id: row.productId, sku: row.sku, barcode: row.barcode,
      options: row.options as JsonValue, specifications: row.specifications as JsonValue, status: row.status,
      primary_image_url: null, created_at: (row.createdAt ?? new Date()).toISOString(),
      updated_at: (row.updatedAt ?? row.createdAt ?? new Date()).toISOString() }));
  }
  private async productDto(row: any): Promise<CatalogProduct> {
    const attrs = this.obj(row.attributes);
    const translation = await this.db.productTranslation.findFirst({ where: { productId: row.id }, orderBy: { id: "asc" } });
    return { id: row.id, slug: translation?.slug ?? attrs.slug ?? `product-${row.id}`,
      name: translation?.name ?? attrs.name ?? `Product ${row.id}`,
      short_description: translation?.shortDescription ?? attrs.short_description ?? "",
      description: attrs.description ?? this.obj(translation?.content).description ?? null,
      age_min: row.ageMin ?? null, age_max: row.ageMax ?? null, tags: this.arr<string>(attrs.tags),
      primary_image_url: attrs.primary_image_url ?? null, status: row.status, primary_category_id: row.primaryCategoryId,
      category_ids: this.arr<number>(attrs.category_ids ?? [row.primaryCategoryId]),
      market_visibility: row.marketVisibility as JsonValue, localized_content: (attrs.localized_content ?? {}) as JsonValue,
      media_asset_ids: this.arr<number>(attrs.media_asset_ids), related_product_ids: this.arr<number>(attrs.related_product_ids),
      variants: await this.variantsFor([row.id]), published_at: this.iso(row.publishedAt), archived_at: this.iso(row.archivedAt),
      created_at: (row.createdAt ?? new Date()).toISOString(), updated_at: (row.updatedAt ?? row.createdAt ?? new Date()).toISOString() };
  }
  private productWhere(query: CatalogProductListQuery): any {
    const where: any = {}; if (query.status) where.status = query.status; if (query.category_id) where.primaryCategoryId = query.category_id;
    if (query.q) where.OR = [{ productTranslations: { some: { name: { contains: query.q, mode: "insensitive" } } } },
      { productTranslations: { some: { slug: { contains: query.q, mode: "insensitive" } } } }];
    return where;
  }
  async listProducts(query: CatalogProductListQuery): Promise<{ items: CatalogProduct[]; page: number; page_size: number; total: number }> {
    const where = this.productWhere(query);
    const [rows, total] = await Promise.all([
      this.db.product.findMany({ where, orderBy: query.sort === "newest" ? { createdAt: "desc" } : { id: query.sort === "name_desc" ? "desc" : "asc" },
        skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.db.product.count({ where }),
    ]);
    let items = await Promise.all(rows.map((r) => this.productDto(r)));
    if (query.market) items = items.filter((p) => { const markets = this.arr<string>(this.obj(p.market_visibility).markets); return !markets.length || markets.includes(query.market!); });
    return { items, page: query.page, page_size: query.page_size, total: query.market ? items.length : total };
  }
  async getProductById(id: number): Promise<CatalogProduct> { const row = await this.db.product.findUnique({ where: { id } }); if (!row) throw new NotFoundException("商品不存在"); return this.productDto(row); }
  async getProductBySlug(slug: string): Promise<CatalogProduct> {
    const translation = await this.db.productTranslation.findFirst({ where: { slug }, orderBy: { id: "asc" } });
    if (!translation) throw new NotFoundException("商品不存在"); const row = await this.db.product.findUnique({ where: { id: translation.productId } });
    if (!row) throw new NotFoundException("商品不存在"); return this.productDto(row);
  }
  async getCategoryById(id: number): Promise<CatalogCategory> { const row = await this.db.category.findUnique({ where: { id } }); if (!row) throw new NotFoundException("分类不存在"); return this.categoryDto(row); }
  async upsertProduct(input: (CatalogProductCreateInput & { id?: number }) | (CatalogProductUpdateInput & { id: number })): Promise<CatalogProduct> {
    const value: any = input; const existing = value.id ? await this.db.product.findUnique({ where: { id: value.id } }) : null;
    if (value.id && !existing) throw new NotFoundException("商品不存在");
    const old = this.obj(existing?.attributes);
    const attrs = { ...old, ...(value.name === undefined ? {} : { name: value.name }), ...(value.short_description === undefined ? {} : { short_description: value.short_description }),
      ...(value.description === undefined ? {} : { description: value.description }), ...(value.tags === undefined ? {} : { tags: value.tags }),
      ...(value.primary_image_url === undefined ? {} : { primary_image_url: value.primary_image_url }), ...(value.localized_content === undefined ? {} : { localized_content: value.localized_content }),
      ...(value.category_ids === undefined ? {} : { category_ids: value.category_ids }), ...(value.media_asset_ids === undefined ? {} : { media_asset_ids: value.media_asset_ids }),
      ...(value.related_product_ids === undefined ? {} : { related_product_ids: value.related_product_ids }), ...(value.slug === undefined ? {} : { slug: value.slug }) };
    const data: any = { primaryCategoryId: value.primary_category_id ?? existing?.primaryCategoryId, status: value.status ?? existing?.status ?? "draft",
      ageMin: value.age_min ?? existing?.ageMin ?? null, ageMax: value.age_max ?? existing?.ageMax ?? null, attributes: attrs,
      marketVisibility: value.market_visibility ?? existing?.marketVisibility ?? {}, publishedAt: existing?.publishedAt ?? null, archivedAt: existing?.archivedAt ?? null };
    const row = await this.db.$transaction(async (tx) => {
      const saved = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data });
      for (const variant of value.variants ?? []) {
        const variantData: any = { productId: saved.id, sku: variant.sku, barcode: variant.barcode ?? null, options: variant.options, specifications: variant.specifications, status: variant.status };
        const current = await tx.variant.findUnique({ where: { sku: variant.sku } });
        if (current) await tx.variant.update({ where: { id: current.id }, data: variantData }); else await tx.variant.create({ data: variantData });
      }
      const slug = value.slug ?? old.slug ?? `product-${saved.id}`; const name = value.name ?? old.name ?? `Product ${saved.id}`; const short = value.short_description ?? old.short_description ?? "";
      await tx.productTranslation.upsert({ where: { market_locale_slug: { market: "global", locale: "en-US", slug } },
        create: { productId: saved.id, market: "global", locale: "en-US", slug, name, shortDescription: short, content: { description: value.description ?? old.description ?? null } },
        update: { productId: saved.id, name, shortDescription: short, content: { description: value.description ?? old.description ?? null } } });
      return saved;
    });
    return this.productDto(row);
  }
  async publishProduct(id: number): Promise<CatalogProduct> { const row = await this.db.product.update({ where: { id }, data: { status: "active", publishedAt: new Date(), archivedAt: null } }).catch(() => null); if (!row) throw new NotFoundException("商品不存在"); return this.productDto(row); }
  async archiveProduct(id: number): Promise<CatalogProduct> { const row = await this.db.product.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } }).catch(() => null); if (!row) throw new NotFoundException("商品不存在"); return this.productDto(row); }
  async listVariants(): Promise<CatalogVariant[]> { return this.variantsFor(); }
  async findVariantBySku(sku: string): Promise<CatalogVariant | null> { const row = await this.db.variant.findUnique({ where: { sku } }); return row ? (await this.variantsFor([row.productId])).find((v) => v.id === row.id) ?? null : null; }
  async getVariantById(id: number): Promise<CatalogVariant> { const row = await this.db.variant.findUnique({ where: { id } }); if (!row) throw new NotFoundException("SKU 不存在"); return (await this.variantsFor([row.productId])).find((v) => v.id === id)!; }

  private async contentDto(row: any): Promise<ContentEntry> {
    return { id: row.id, type: row.type, slug: row.slug, title: row.title, body: row.body as JsonValue,
      seo: row.seo as any, status: row.status, locale: row.locale, market: row.market,
      translation_status: "published", linked_product_ids: [],
      media_asset_ids: [], published_at: this.iso(row.publishedAt),
      archived_at: this.iso(row.archivedAt), created_at: (row.createdAt ?? row.updatedAt ?? new Date()).toISOString(),
      updated_at: (row.updatedAt ?? new Date()).toISOString() };
  }
  async listContentEntries(query: ContentEntryListQuery): Promise<{ items: ContentEntry[]; page: number; page_size: number; total: number }> {
    const where: any = { ...(query.type ? { type: query.type } : {}), ...(query.status ? { status: query.status } : {}),
      ...(query.locale ? { locale: query.locale } : {}), ...(query.market ? { market: query.market } : {}),
      ...(query.q ? { OR: [{ slug: { contains: query.q, mode: "insensitive" } }, { title: { contains: query.q, mode: "insensitive" } }] } : {}) };
    const [rows, total] = await Promise.all([
      this.db.contentEntry.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.db.contentEntry.count({ where }),
    ]);
    return { items: await Promise.all(rows.map((r) => this.contentDto(r))), page: query.page, page_size: query.page_size, total };
  }
  async getContentEntryBySlug(slug: string, type?: ContentEntry["type"]): Promise<ContentEntry> {
    const row = await this.db.contentEntry.findFirst({ where: { slug, ...(type ? { type } : {}) }, orderBy: { updatedAt: "desc" } });
    if (!row) throw new NotFoundException("内容不存在"); return this.contentDto(row);
  }
  async getContentEntryById(id: number): Promise<ContentEntry> { const row = await this.db.contentEntry.findUnique({ where: { id } }); if (!row) throw new NotFoundException("内容不存在"); return this.contentDto(row); }
  async upsertContentEntry(input: (ContentEntryCreateInput & { id?: number }) | (ContentEntryUpdateInput & { id: number })): Promise<ContentEntry> {
    const value: any = input; const existing = value.id ? await this.db.contentEntry.findUnique({ where: { id: value.id } }) : null;
    if (value.id && !existing) throw new NotFoundException("内容不存在");
    const data: any = { type: value.type ?? existing?.type ?? "page", slug: value.slug ?? existing?.slug ?? "", title: value.title ?? existing?.title ?? "",
      body: value.body ?? existing?.body ?? {}, seo: value.seo ?? existing?.seo ?? { title: value.title ?? "", description: "", indexable: false },
      status: value.status ?? existing?.status ?? "draft", locale: value.locale ?? existing?.locale ?? "en-US", market: value.market ?? existing?.market ?? "global",
      publishedAt: value.status === "published" ? new Date() : existing?.publishedAt ?? null, archivedAt: value.status === "archived" ? new Date() : existing?.archivedAt ?? null };
    try { const row = existing ? await this.db.contentEntry.update({ where: { id: existing.id }, data }) : await this.db.contentEntry.create({ data }); return this.contentDto(row); }
    catch { throw new ConflictException("内容 slug 已存在"); }
  }
  async publishContentEntry(id: number): Promise<ContentEntry> { const row = await this.db.contentEntry.update({ where: { id }, data: { status: "published", publishedAt: new Date(), archivedAt: null } }).catch(() => null); if (!row) throw new NotFoundException("内容不存在"); return this.contentDto(row); }
  async archiveContentEntry(id: number): Promise<ContentEntry> { const row = await this.db.contentEntry.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } }).catch(() => null); if (!row) throw new NotFoundException("内容不存在"); return this.contentDto(row); }
  async listNavigation(): Promise<ContentNavigation[]> {
    const rows = await this.db.contentEntry.findMany({ where: { type: "navigation", status: "published" }, orderBy: { updatedAt: "desc" } });
    return rows.map((r) => ({ id: r.id, slug: r.slug, market: r.market, locale: r.locale, status: r.status,
      items: this.arr(this.obj(r.body).items), created_at: (r.createdAt ?? r.updatedAt ?? new Date()).toISOString(), updated_at: (r.updatedAt ?? new Date()).toISOString() })) as ContentNavigation[];
  }

  private async mediaDto(row: any): Promise<MediaAsset> {
    const created = row.createdAt ?? new Date(); const versions = this.arr(row.versions);
    return { id: row.id, type: row.type, file_key: row.fileKey, mime: row.mime, size: row.size, checksum: row.checksum,
      alt: row.alt ?? null, visibility: row.visibility, tags: this.arr<string>(row.tags),
      versions: versions.length ? versions : [{ version: row.version, file_key: row.fileKey, mime: row.mime, size: row.size, checksum: row.checksum, created_at: created.toISOString() }],
      metadata: row.metadata as JsonValue, created_at: created.toISOString(), updated_at: (row.updatedAt ?? created).toISOString() };
  }
  async listMediaAssets(query: MediaAssetListQuery): Promise<{ items: MediaAsset[]; page: number; page_size: number; total: number }> {
    const where: any = { ...(query.visibility ? { visibility: query.visibility } : {}), ...(query.type ? { type: query.type } : {}) };
    const [rows, count] = await Promise.all([
      this.db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.db.mediaAsset.count({ where }),
    ]);
    let items = await Promise.all(rows.map((r) => this.mediaDto(r)));
    if (query.q) items = items.filter((a) => `${a.file_key} ${a.alt ?? ""} ${a.tags.join(" ")}`.toLowerCase().includes(query.q!.toLowerCase()));
    return { items, page: query.page, page_size: query.page_size, total: query.q ? items.length : count };
  }
  async createMediaAsset(input: MediaAssetCreateInput): Promise<MediaAsset> {
    const now = new Date();
    try {
      const row = await this.db.mediaAsset.create({ data: { type: input.type, fileKey: input.file_key, mime: input.mime, size: input.size, checksum: input.checksum,
        alt: input.alt ?? null, visibility: input.visibility, tags: input.tags, version: "1", versions: [{ version: "1", file_key: input.file_key, mime: input.mime, size: input.size, checksum: input.checksum, created_at: now.toISOString() }], metadata: input.metadata ?? {} } as any });
      return this.mediaDto(row);
    } catch { throw new ConflictException("媒体文件已存在"); }
  }
  async getMediaAsset(id: number): Promise<MediaAsset> { const row = await this.db.mediaAsset.findUnique({ where: { id } }); if (!row) throw new NotFoundException("媒体不存在"); return this.mediaDto(row); }
  async signMediaAsset(id: number): Promise<{ asset_id: number; url: string; expires_at: string; method: "GET" }> { const asset = await this.getMediaAsset(id); return { asset_id: asset.id, url: `https://media.wemove.local/${asset.file_key}?signature=${asset.checksum}`, expires_at: new Date(Date.now() + 900000).toISOString(), method: "GET" }; }

  private contentUrl(type: string, slug: string): string { const prefix = type === "article" ? "/articles" : type === "faq" ? "/faq" : type === "download" ? "/downloads" : type === "banner" ? "/banners" : type === "navigation" ? "/navigation" : "/pages"; return `${prefix}/${slug}`; }
  private async primaryImage(ids: number[]): Promise<string | null> { const id = ids[0]; if (!id) return null; const row = await this.db.mediaAsset.findUnique({ where: { id } }); return row ? `https://media.wemove.local/${row.fileKey}` : null; }
  async search(query: SearchQuery): Promise<{ items: SearchHit[]; page: number; page_size: number; total: number }> {
    const products = await this.listProducts({ page: 1, page_size: 100, status: "active", q: query.q });
    const contents = await this.listContentEntries({ page: 1, page_size: 100, status: "published", q: query.q, market: query.market, locale: query.locale });
    const hits: SearchHit[] = [];
    if (!query.type || query.type === "product") for (const p of products.items) hits.push({ entity_type: "product", entity_id: p.id, slug: p.slug, title: p.name, snippet: p.short_description, url: `/products/${p.slug}`, market: query.market ?? "global", locale: query.locale ?? "en-US", status: p.status, score: 100 - hits.length, primary_image_url: p.primary_image_url });
    if (!query.type || query.type !== "product") for (const c of contents.items) hits.push({ entity_type: c.type === "article" ? "article" : c.type === "faq" ? "faq" : c.type === "download" ? "download" : "page", entity_id: c.id, slug: c.slug, title: c.title, snippet: typeof c.body === "string" ? c.body : c.title, url: this.contentUrl(c.type, c.slug), market: c.market, locale: c.locale, status: c.status, score: 90 - hits.length, primary_image_url: await this.primaryImage(c.media_asset_ids) });
    const start = (query.page - 1) * query.page_size; return { items: hits.sort((a, b) => b.score - a.score).slice(start, start + query.page_size), page: query.page, page_size: query.page_size, total: hits.length };
  }
  async suggest(query: SearchQuery): Promise<{ q: string; suggestions: string[] }> { const result = await this.search({ ...query, page: 1, page_size: 100 }); return { q: query.q, suggestions: [...new Set(result.items.flatMap((h) => [h.title, h.slug]))].slice(0, 8) }; }
  async buildSeoMetadata(path: string, market = "global", locale = "en-US"): Promise<any> {
    const slug = path.replace(/^\/products\//, ""); const translation = await this.db.productTranslation.findFirst({ where: { slug } });
    if (translation) { const p = await this.db.product.findUnique({ where: { id: translation.productId } }); const a = this.obj(p?.attributes); return { title: translation.name, description: translation.shortDescription, canonical_url: `https://www.wemovetoy.com${path}`, og_title: translation.name, og_description: translation.shortDescription, ...(a.primary_image_url ? { og_image_url: a.primary_image_url } : {}), indexable: p?.status === "active" }; }
    const content = await this.db.contentEntry.findFirst({ where: { slug: path.replace(/^\/(?:pages|articles|faq|downloads|banners|navigation)\//, "") } });
    if (content) { const seo = this.obj(content.seo); return { title: seo.title ?? content.title, description: seo.description ?? "", canonical_url: seo.canonical_url ?? `https://www.wemovetoy.com${path}`, og_title: seo.og_title ?? seo.title ?? content.title, og_description: seo.og_description ?? seo.description ?? "", ...(seo.og_image_url ? { og_image_url: seo.og_image_url } : {}), indexable: Boolean(seo.indexable) }; }
    return { title: `WEMOVE SPORTS - ${market}`, description: `Fallback metadata for ${locale}`, canonical_url: `https://www.wemovetoy.com${path}`, indexable: false };
  }
  async buildSitemap(): Promise<{ generated_at: string; entries: SeoSitemapEntry[] }> {
    const [products, contents] = await Promise.all([this.db.product.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" } }), this.db.contentEntry.findMany({ where: { status: "published" }, orderBy: { updatedAt: "desc" } })]);
    const entries: SeoSitemapEntry[] = [];
    for (const p of products) { const t = await this.db.productTranslation.findFirst({ where: { productId: p.id }, orderBy: { id: "asc" } }); if (t) entries.push({ url: `https://www.wemovetoy.com/products/${t.slug}`, lastmod: (p.updatedAt ?? p.createdAt).toISOString(), locale: t.locale, market: t.market, changefreq: "weekly", priority: 0.8 }); }
    for (const c of contents) entries.push({ url: `https://www.wemovetoy.com${this.contentUrl(c.type, c.slug)}`, lastmod: (c.updatedAt ?? new Date()).toISOString(), locale: c.locale, market: c.market, changefreq: "monthly", priority: c.type === "page" ? 1 : 0.5 });
    return { generated_at: new Date().toISOString(), entries };
  }

  async listRedirects(): Promise<{ items: SeoRedirect[]; page: number; page_size: number; total: number }> {
    const rows = await this.db.redirect.findMany({ orderBy: { createdAt: "desc" } });
    return this.page(rows.map((r) => ({ id: r.id, source_path: r.sourcePath, target_path: r.targetPath, status_code: r.statusCode, created_at: r.createdAt.toISOString(), updated_at: r.createdAt.toISOString() })));
  }
  async upsertRedirect(input: SeoRedirectCreateInput & { id?: number }): Promise<SeoRedirect> {
    let row: any;
    if (input.id) {
      row = await this.db.redirect.update({ where: { id: input.id }, data: { sourcePath: input.source_path, targetPath: input.target_path, statusCode: input.status_code ?? 301 } }).catch(() => null);
      if (!row) throw new NotFoundException("重定向不存在");
    } else {
      try { row = await this.db.redirect.create({ data: { sourcePath: input.source_path, targetPath: input.target_path, statusCode: input.status_code ?? 301 } }); }
      catch { throw new ConflictException("重定向已存在"); }
    }
    return { id: row.id, source_path: row.sourcePath, target_path: row.targetPath, status_code: row.statusCode, created_at: row.createdAt.toISOString(), updated_at: row.createdAt.toISOString() };
  }

  private async formDto(row: any): Promise<FormSubmission> {
    return { id: row.id, submission_no: row.submissionNo, type: row.type, source: row.source, payload: row.payload as JsonValue,
      attachments: this.arr<number>(row.attachments), assignee_id: row.assigneeId ?? null, priority: row.priority ?? "normal",
      tags: this.arr<string>(row.tags), internal_note: row.internalNote ?? null, status: row.status, request_id: row.requestId,
      created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(), history: this.arr(row.history) };
  }
  async listFormSubmissions(query: FormSubmissionListQuery): Promise<{ items: FormSubmission[]; page: number; page_size: number; total: number }> {
    const where: any = { ...(query.type ? { type: query.type } : {}), ...(query.status ? { status: query.status } : {}), ...(query.assignee_id ? { assigneeId: query.assignee_id } : {}) };
    const [rows, total] = await Promise.all([this.db.formSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.page_size, take: query.page_size }), this.db.formSubmission.count({ where })]);
    return { items: await Promise.all(rows.map((r) => this.formDto(r))), page: query.page, page_size: query.page_size, total };
  }
  async getFormSubmissionById(id: number): Promise<FormSubmission> { const row = await this.db.formSubmission.findUnique({ where: { id } }); if (!row) throw new NotFoundException("表单不存在"); return this.formDto(row); }
  async createFormSubmission(input: FormSubmissionCreateInput & { request_id: string }): Promise<FormSubmission> {
    const existing = await this.db.formSubmission.findFirst({ where: { requestId: input.request_id, type: input.type } }); if (existing) return this.formDto(existing);
    const now = new Date(); const row = await this.db.formSubmission.create({ data: { submissionNo: `FS-${now.getTime()}-${Math.floor(Math.random() * 1000)}`, type: input.type, source: input.source, payload: input.payload, attachments: input.attachments, priority: input.priority, tags: input.tags, status: "new", requestId: input.request_id, history: [{ status: "new", note: null, actor_id: null, request_id: input.request_id, created_at: now.toISOString() }] } as any });
    return this.formDto(row);
  }
  async updateFormSubmission(id: number, input: FormSubmissionUpdateInput, request_id: string, actor_id: number | null): Promise<FormSubmission> {
    const current = await this.getFormSubmissionById(id); const now = new Date(); const nextStatus = input.status ?? current.status;
    const history = [...current.history, { status: nextStatus, note: input.internal_note ?? null, actor_id, request_id, created_at: now.toISOString() }];
    const row = await this.db.formSubmission.update({ where: { id }, data: { assigneeId: input.assignee_id !== undefined ? input.assignee_id : current.assignee_id, priority: input.priority ?? current.priority, tags: input.tags ?? current.tags, internalNote: input.internal_note !== undefined ? input.internal_note : current.internal_note, status: nextStatus, history } } as any);
    return this.formDto(row);
  }

  private async templateDto(row: any): Promise<NotificationTemplate> {
    return { id: row.id, code: row.templateKey, audience: "user", channel: row.channel, locale: row.locale, subject: row.subject, body: row.body,
      variables: this.arr<string>(row.variables), category: row.status, active: row.status === "active", created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString() };
  }
  async listNotificationTemplates(): Promise<{ items: NotificationTemplate[]; page: number; page_size: number; total: number }> {
    const rows = await this.db.notificationTemplate.findMany({ orderBy: [{ templateKey: "asc" }, { id: "asc" }] });
    return this.page(await Promise.all(rows.map((r) => this.templateDto(r))));
  }
  async upsertNotificationTemplate(input: (NotificationTemplateCreateInput & { id?: number }) | (NotificationTemplateUpdateInput & { id: number })): Promise<NotificationTemplate> {
    const value: any = input;
    if (value.id) {
      const row = await this.db.notificationTemplate.update({ where: { id: value.id }, data: { templateKey: value.code, channel: value.channel, locale: value.locale, subject: value.subject, body: value.body, variables: value.variables, status: value.active ? "active" : "draft" } }).catch(() => null);
      if (!row) throw new NotFoundException("通知模板不存在"); return this.templateDto(row);
    }
    const existing = await this.db.notificationTemplate.findFirst({ where: { templateKey: value.code, channel: value.channel, locale: value.locale } });
    if (existing) return this.templateDto(existing);
    const row = await this.db.notificationTemplate.create({ data: { templateKey: value.code, channel: value.channel, locale: value.locale, subject: value.subject, body: value.body, variables: value.variables, status: value.active ? "active" : "draft" } });
    return this.templateDto(row);
  }
  async getNotificationTemplateById(id: number): Promise<NotificationTemplate> { const row = await this.db.notificationTemplate.findUnique({ where: { id } }); if (!row) throw new NotFoundException("通知模板不存在"); return this.templateDto(row); }
  private async deliveryDto(row: any): Promise<NotificationDelivery> {
    const payload = this.obj(row.payload);
    return { id: row.id, template_code: row.templateKey, recipient_user_id: row.userId ?? null, company_id: row.companyId ?? null, audience: payload.audience ?? "user",
      channel: row.channel, status: row.status, request_id: payload.request_id ?? "", payload: (payload.data ?? row.payload) as JsonValue, attempts: row.attempts ?? 1,
      provider_message_id: row.providerId ?? null, failure_reason: row.failureReason ?? null, created_at: row.createdAt.toISOString(),
      sent_at: this.iso(row.sentAt), updated_at: (row.updatedAt ?? row.createdAt).toISOString() };
  }
  async listNotificationDeliveries(query: NotificationDeliveryListQuery): Promise<{ items: NotificationDelivery[]; page: number; page_size: number; total: number }> {
    const where: any = { ...(query.recipient_user_id ? { userId: query.recipient_user_id } : {}), ...(query.company_id ? { companyId: query.company_id } : {}),
      ...(query.status ? { status: query.status } : {}) };
    const [rows, total] = await Promise.all([this.db.notificationDelivery.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.page_size, take: query.page_size }), this.db.notificationDelivery.count({ where })]);
    return { items: await Promise.all(rows.map((r) => this.deliveryDto(r))), page: query.page, page_size: query.page_size, total };
  }
  async getNotificationDeliveryById(id: number): Promise<NotificationDelivery> { const row = await this.db.notificationDelivery.findUnique({ where: { id } }); if (!row) throw new NotFoundException("通知投递不存在"); return this.deliveryDto(row); }
  async recordNotificationDelivery(input: NotificationDeliveryCreateInput): Promise<NotificationDelivery> {
    const requestId = input.request_id ?? `${input.template_code}:${input.channel}:${input.recipient_user_id ?? "null"}:${input.company_id ?? "null"}`;
    const existing = await this.db.notificationDelivery.findFirst({ where: { templateKey: input.template_code, channel: input.channel, userId: input.recipient_user_id ?? null, companyId: input.company_id ?? null } });
    if (existing) return this.deliveryDto(existing);
    const row = await this.db.notificationDelivery.create({ data: { templateKey: input.template_code, userId: input.recipient_user_id ?? null, companyId: input.company_id ?? null, channel: input.channel, status: input.status ?? "queued", payload: { audience: input.audience, request_id: requestId, data: input.payload }, attempts: 1, providerId: input.provider_message_id ?? null, failureReason: input.failure_reason ?? null, sentAt: input.status === "sent" ? new Date() : null } } as any);
    return this.deliveryDto(row);
  }
  async retryNotificationDelivery(id: number, request_id: string, reason?: string): Promise<NotificationDelivery> {
    const current = await this.getNotificationDeliveryById(id);
    const row = await this.db.notificationDelivery.update({ where: { id }, data: { status: "retrying", attempts: current.attempts + 1, failureReason: reason ?? current.failure_reason, payload: { request_id, data: current.payload } } } as any);
    return this.deliveryDto(row);
  }
}
