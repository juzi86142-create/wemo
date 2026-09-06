import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CatalogCategory,
  CatalogCategoryCreateInput,
  CatalogCategoryListQuery,
  CatalogProduct,
  CatalogProductCreateInput,
  CatalogProductListQuery,
  CatalogProductUpdateInput,
  CatalogVariant,
} from "@wemo/contracts/catalog";
import type {
  ContentEntry,
  ContentEntryCreateInput,
  ContentEntryListQuery,
  ContentEntryUpdateInput,
  ContentNavigation,
  FormSubmission,
  FormSubmissionCreateInput,
  FormSubmissionListQuery,
  FormSubmissionUpdateInput,
  LocalizationLocale,
  LocalizationMarket,
  LocalizationRoute,
  MediaAsset,
  MediaAssetCreateInput,
  MediaAssetListQuery,
  NotificationDelivery,
  NotificationDeliveryCreateInput,
  NotificationDeliveryListQuery,
  NotificationTemplate,
  NotificationTemplateCreateInput,
  NotificationTemplateUpdateInput,
  SearchHit,
  SearchQuery,
  SeoRedirect,
  SeoRedirectCreateInput,
  SeoSitemapEntry,
} from "@wemo/contracts/content";
import type {
  Cart,
  CartItem,
  CartItemUpsertInput,
  CartListQuery,
  CommerceChannel,
  InventoryBalance,
  InventoryBalanceListQuery,
  InventoryReservation,
  InventoryReservationCreateInput,
  InventoryReservationListQuery,
  InventoryReservationStatus,
  Order,
  OrderCreateInput,
  OrderItem,
  OrderListQuery,
  OrderStatus,
  Payment,
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentListQuery,
  PaymentStatus,
  PricingPreviewRequest,
  PricingRecord,
  PricingRecordListQuery,
  Quote,
  QuoteCreateInput,
  QuoteListQuery,
  QuoteStatus,
  QuoteVersion,
  ReturnCreateInput,
  ReturnListQuery,
  ReturnRequest,
  ReturnStatus,
} from "@wemo/contracts/commerce";
import type { JsonValue } from "@wemo/contracts/common";

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map((item) => clone(item)),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function lower(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function urlForProduct(slug: string): string {
  return `/products/${slug}`;
}

function urlForContent(type: string, slug: string): string {
  const prefix =
    type === "article"
      ? "/articles"
      : type === "faq"
        ? "/faq"
        : type === "download"
          ? "/downloads"
          : type === "banner"
            ? "/banners"
            : type === "navigation"
              ? "/navigation"
              : "/pages";
  return `${prefix}/${slug}`;
}

@Injectable()
export class ExperienceStateStore {
  private categorySeq = 1;
  private productSeq = 1;
  private contentSeq = 1;
  private mediaSeq = 1;
  private redirectSeq = 1;
  private submissionSeq = 1;
  private templateSeq = 1;
  private deliverySeq = 1;

  private readonly markets: LocalizationMarket[] = [
    {
      code: "global",
      default_locale: "en-US",
      currency: "USD",
      timezone: "UTC",
      fallback_locales: ["en-US", "zh-CN"],
      status: "active",
    },
    {
      code: "US",
      default_locale: "en-US",
      currency: "USD",
      timezone: "America/New_York",
      fallback_locales: ["en-US", "zh-CN"],
      status: "active",
    },
  ];

  private readonly locales: LocalizationLocale[] = [
    {
      code: "en-US",
      name: "English (US)",
      market: "global",
      direction: "ltr",
      fallback_locale: null,
      status: "active",
    },
    {
      code: "zh-CN",
      name: "简体中文",
      market: "global",
      direction: "ltr",
      fallback_locale: "en-US",
      status: "active",
    },
  ];

  private readonly routes: LocalizationRoute[] = [
    {
      market: "global",
      locale: "en-US",
      prefix: "/",
      default: true,
      fallback_chain: ["en-US", "zh-CN"],
    },
    {
      market: "global",
      locale: "zh-CN",
      prefix: "/zh-cn",
      default: false,
      fallback_chain: ["zh-CN", "en-US"],
    },
  ];

  private readonly categories: CatalogCategory[] = [
    {
      id: this.categorySeq++,
      parent_id: null,
      slug: "vehicles",
      name: "Vehicles",
      status: "active",
      sort_order: 1,
      localized_content: {
        "en-US": { name: "Vehicles" },
        "zh-CN": { name: "交通玩具" },
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.categorySeq++,
      parent_id: null,
      slug: "creative-play",
      name: "Creative Play",
      status: "active",
      sort_order: 2,
      localized_content: {
        "en-US": { name: "Creative Play" },
        "zh-CN": { name: "创意玩乐" },
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  private readonly products: CatalogProduct[] = [
    this.createSeedProduct({
      slug: "demo-bus",
      name: "Demo Bus",
      short_description: "A friendly bus for everyday play.",
      description: "Stable product detail for the public catalog.",
      age_min: 3,
      age_max: 8,
      tags: ["vehicle", "education"],
      primary_image_url: "https://images.example.com/demo-bus.jpg",
      status: "active",
      primary_category_id: 1,
      category_ids: [1],
      market_visibility: { markets: ["global", "US"] },
      localized_content: {
        "en-US": {
          description: "A friendly bus for everyday play.",
        },
        "zh-CN": {
          description: "适合日常玩耍的友好巴士。",
        },
      },
      media_asset_ids: [1],
      related_product_ids: [2],
      variants: [
        {
          sku: "BUS-001",
          barcode: "BUS-001",
          options: { color: "yellow" },
          specifications: { length_cm: 22 },
          status: "active",
          primary_image_url: "https://images.example.com/demo-bus-1.jpg",
        },
      ],
    }),
    this.createSeedProduct({
      slug: "demo-racer",
      name: "Demo Racer",
      short_description: "A compact racer for fast hands.",
      description: "Second seeded product for catalog and search flows.",
      age_min: 4,
      age_max: 10,
      tags: ["vehicle", "speed"],
      primary_image_url: "https://images.example.com/demo-racer.jpg",
      status: "active",
      primary_category_id: 1,
      category_ids: [1, 2],
      market_visibility: { markets: ["global", "US"] },
      localized_content: {
        "en-US": {
          description: "A compact racer for fast hands.",
        },
        "zh-CN": {
          description: "给小朋友快速上手的竞速玩具。",
        },
      },
      media_asset_ids: [2],
      related_product_ids: [1],
      variants: [
        {
          sku: "RACER-001",
          barcode: "RACER-001",
          options: { color: "red" },
          specifications: { length_cm: 18 },
          status: "active",
          primary_image_url: "https://images.example.com/demo-racer-1.jpg",
        },
      ],
    }),
  ];

  private readonly mediaAssets: MediaAsset[] = [
    {
      id: this.mediaSeq++,
      type: "image",
      file_key: "catalog/demo-bus.jpg",
      mime: "image/jpeg",
      size: 245_000,
      checksum: "demo-bus-checksum",
      alt: "Demo Bus",
      visibility: "public",
      tags: ["product", "hero"],
      versions: [
        {
          version: "1",
          file_key: "catalog/demo-bus.jpg",
          mime: "image/jpeg",
          size: 245_000,
          checksum: "demo-bus-checksum",
          created_at: nowIso(),
        },
      ],
      metadata: {
        width: 1600,
        height: 900,
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.mediaSeq++,
      type: "image",
      file_key: "catalog/demo-racer.jpg",
      mime: "image/jpeg",
      size: 198_000,
      checksum: "demo-racer-checksum",
      alt: "Demo Racer",
      visibility: "registered",
      tags: ["product", "detail"],
      versions: [
        {
          version: "1",
          file_key: "catalog/demo-racer.jpg",
          mime: "image/jpeg",
          size: 198_000,
          checksum: "demo-racer-checksum",
          created_at: nowIso(),
        },
      ],
      metadata: {
        width: 1440,
        height: 960,
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  private readonly contentEntries: ContentEntry[] = [
    {
      id: this.contentSeq++,
      type: "page",
      slug: "home",
      title: "WEMOVE SPORTS",
      body: {
        sections: [
          { kind: "hero", title: "WEMOVE SPORTS", description: "Move better." },
        ],
      },
      seo: {
        title: "WEMOVE SPORTS",
        description: "Official home page",
        canonical_url: "https://www.wemovetoy.com/",
        og_title: "WEMOVE SPORTS",
        og_description: "Official home page",
        og_image_url: "https://images.example.com/home.jpg",
        indexable: true,
      },
      status: "published",
      locale: "en-US",
      market: "global",
      translation_status: "published",
      linked_product_ids: [1, 2],
      media_asset_ids: [1],
      published_at: nowIso(),
      archived_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.contentSeq++,
      type: "article",
      slug: "toy-safety-guide",
      title: "Toy Safety Guide",
      body: {
        paragraphs: ["Safety first.", "Read the guide before play."],
      },
      seo: {
        title: "Toy Safety Guide",
        description: "Safety guidance for families.",
        canonical_url: "https://www.wemovetoy.com/articles/toy-safety-guide",
        indexable: true,
      },
      status: "published",
      locale: "en-US",
      market: "global",
      translation_status: "published",
      linked_product_ids: [1],
      media_asset_ids: [],
      published_at: nowIso(),
      archived_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.contentSeq++,
      type: "faq",
      slug: "shipping",
      title: "Shipping FAQ",
      body: {
        questions: [
          { q: "Do you ship internationally?", a: "Yes, in selected markets." },
        ],
      },
      seo: {
        title: "Shipping FAQ",
        description: "Common questions about shipping.",
        canonical_url: "https://www.wemovetoy.com/faq/shipping",
        indexable: true,
      },
      status: "published",
      locale: "en-US",
      market: "global",
      translation_status: "published",
      linked_product_ids: [],
      media_asset_ids: [],
      published_at: nowIso(),
      archived_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.contentSeq++,
      type: "navigation",
      slug: "main",
      title: "Main Navigation",
      body: {
        items: [
          { id: 1, label: "Home", path: "/", order: 1, children: [] },
          {
            id: 2,
            label: "Products",
            path: "/products",
            order: 2,
            children: [],
          },
        ],
      },
      seo: {
        title: "Main Navigation",
        description: "Primary navigation",
        indexable: false,
      },
      status: "published",
      locale: "en-US",
      market: "global",
      translation_status: "published",
      linked_product_ids: [],
      media_asset_ids: [],
      published_at: nowIso(),
      archived_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  private readonly redirects: SeoRedirect[] = [
    {
      id: this.redirectSeq++,
      source_path: "/old-home",
      target_path: "/",
      status_code: 301,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  private readonly formSubmissions: FormSubmission[] = [];
  private readonly notificationTemplates: NotificationTemplate[] = [
    this.createSeedTemplate({
      code: "content_published",
      audience: "staff",
      channel: "email",
      locale: "en-US",
      subject: "Content published",
      body: "Content {slug} has been published.",
      variables: ["slug"],
      category: "system",
      active: true,
    }),
    this.createSeedTemplate({
      code: "form_received",
      audience: "staff",
      channel: "email",
      locale: "en-US",
      subject: "Form received",
      body: "A new form submission {submission_no} has been received.",
      variables: ["submission_no"],
      category: "transactional",
      active: true,
    }),
    this.createSeedTemplate({
      code: "order_confirmation",
      audience: "user",
      channel: "email",
      locale: "en-US",
      subject: "Order confirmation",
      body: "Your order {order_no} is confirmed.",
      variables: ["order_no"],
      category: "transactional",
      active: true,
    }),
    this.createSeedTemplate({
      code: "quote_updated",
      audience: "dealer",
      channel: "email",
      locale: "en-US",
      subject: "Quote updated",
      body: "Quote {quote_no} is ready for review.",
      variables: ["quote_no"],
      category: "transactional",
      active: true,
    }),
  ];
  private readonly notificationDeliveries: NotificationDelivery[] = [];
  private readonly deliveryIdempotency = new Map<string, number>();

  private pricingSeq = 1;
  private inventoryBalanceSeq = 1;
  private inventoryReservationSeq = 1;
  private cartSeq = 1;
  private cartItemSeq = 1;
  private orderSeq = 1;
  private orderItemSeq = 1;
  private paymentSeq = 1;
  private returnSeq = 1;
  private quoteSeq = 1;
  private quoteVersionSeq = 1;

  private readonly pricingRecords: PricingRecord[] = [
    {
      id: this.pricingSeq++,
      variant_id: this.products[0]!.variants[0]!.id,
      price_list_id: null,
      dealer_tier_id: null,
      dealer_company_id: null,
      market: "global",
      currency: "USD",
      price_type: "msrp",
      amount_minor: 3999,
      min_quantity: 1,
      rules: { source: "seed" },
      valid_from: null,
      valid_to: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.pricingSeq++,
      variant_id: this.products[0]!.variants[0]!.id,
      price_list_id: 1,
      dealer_tier_id: null,
      dealer_company_id: null,
      market: "global",
      currency: "USD",
      price_type: "price_list",
      amount_minor: 3499,
      min_quantity: 1,
      rules: { source: "seed" },
      valid_from: null,
      valid_to: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.pricingSeq++,
      variant_id: this.products[0]!.variants[0]!.id,
      price_list_id: null,
      dealer_tier_id: 1,
      dealer_company_id: null,
      market: "global",
      currency: "USD",
      price_type: "dealer_tier",
      amount_minor: 3199,
      min_quantity: 1,
      rules: { source: "seed" },
      valid_from: null,
      valid_to: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.pricingSeq++,
      variant_id: this.products[1]!.variants[0]!.id,
      price_list_id: null,
      dealer_tier_id: null,
      dealer_company_id: 1,
      market: "global",
      currency: "USD",
      price_type: "dealer_company",
      amount_minor: 2899,
      min_quantity: 1,
      rules: { source: "seed" },
      valid_from: null,
      valid_to: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
  private readonly inventoryBalances: InventoryBalance[] = [
    {
      id: this.inventoryBalanceSeq++,
      variant_id: this.products[0]!.variants[0]!.id,
      warehouse_code: "WH-US-1",
      market: "global",
      on_hand: 120,
      available: 120,
      reserved: 0,
      source: "seed",
      synced_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: this.inventoryBalanceSeq++,
      variant_id: this.products[1]!.variants[0]!.id,
      warehouse_code: "WH-US-1",
      market: "global",
      on_hand: 80,
      available: 80,
      reserved: 0,
      source: "seed",
      synced_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
  private readonly inventoryReservations: InventoryReservation[] = [];
  private readonly carts: Cart[] = [];
  private readonly orders: Order[] = [];
  private readonly payments: Payment[] = [];
  private readonly returnRequests: ReturnRequest[] = [];
  private readonly quotes: Quote[] = [];

  private readonly inventoryReservationIdempotency = new Map<string, number>();
  private readonly orderRequestIdempotency = new Map<string, number>();
  private readonly paymentIdempotency = new Map<string, number>();
  private readonly returnRequestIdempotency = new Map<string, number>();
  private readonly quoteRequestIdempotency = new Map<string, number>();
  private readonly cartLookup = new Map<string, number>();

  private createSeedProduct(input: CatalogProductCreateInput): CatalogProduct {
    const productId = this.productSeq++;
    const created_at = nowIso();
    const variants = input.variants.map((variant) => ({
      id: this.productSeq++,
      product_id: productId,
      sku: variant.sku,
      barcode: variant.barcode ?? null,
      options: clone(variant.options),
      specifications: clone(variant.specifications),
      status: variant.status,
      primary_image_url: variant.primary_image_url ?? null,
      created_at,
      updated_at: created_at,
    }));

    return {
      id: productId,
      slug: input.slug,
      name: input.name,
      short_description: input.short_description,
      description: input.description ?? null,
      age_min: input.age_min ?? null,
      age_max: input.age_max ?? null,
      tags: [...input.tags],
      primary_image_url: input.primary_image_url ?? null,
      status: input.status,
      primary_category_id: input.primary_category_id,
      category_ids: [...input.category_ids],
      market_visibility: clone(input.market_visibility),
      localized_content: clone(input.localized_content),
      media_asset_ids: [...input.media_asset_ids],
      related_product_ids: [...input.related_product_ids],
      variants,
      published_at: input.status === "active" ? created_at : null,
      archived_at: input.status === "archived" ? created_at : null,
      created_at,
      updated_at: created_at,
    };
  }

  private createSeedTemplate(input: NotificationTemplateCreateInput): NotificationTemplate {
    const created_at = nowIso();
    return {
      id: this.templateSeq++,
      code: input.code,
      audience: input.audience,
      channel: input.channel,
      locale: input.locale,
      subject: input.subject,
      body: input.body,
      variables: [...input.variables],
      category: input.category,
      active: input.active,
      created_at,
      updated_at: created_at,
    };
  }

  private resolveVariantById(variantId: number): CatalogVariant {
    for (const product of this.products) {
      const variant = product.variants.find((entry) => entry.id === variantId);
      if (variant) {
        return variant;
      }
    }
    throw new NotFoundException("SKU 不存在");
  }

  private getProductIndex(productId: number): number {
    const index = this.products.findIndex((product) => product.id === productId);
    if (index < 0) {
      throw new NotFoundException("商品不存在");
    }
    return index;
  }

  private getContentIndex(contentId: number): number {
    const index = this.contentEntries.findIndex((entry) => entry.id === contentId);
    if (index < 0) {
      throw new NotFoundException("内容不存在");
    }
    return index;
  }

  private getMediaIndex(mediaId: number): number {
    const index = this.mediaAssets.findIndex((entry) => entry.id === mediaId);
    if (index < 0) {
      throw new NotFoundException("媒体不存在");
    }
    return index;
  }

  private getSubmissionIndex(submissionId: number): number {
    const index = this.formSubmissions.findIndex((entry) => entry.id === submissionId);
    if (index < 0) {
      throw new NotFoundException("表单不存在");
    }
    return index;
  }

  private getNotificationDeliveryIndex(deliveryId: number): number {
    const index = this.notificationDeliveries.findIndex((entry) => entry.id === deliveryId);
    if (index < 0) {
      throw new NotFoundException("通知投递不存在");
    }
    return index;
  }

  listMarkets(): { items: LocalizationMarket[]; page: number; page_size: number; total: number } {
    return paginate(this.markets);
  }

  listLocales(): { items: LocalizationLocale[]; page: number; page_size: number; total: number } {
    return paginate(this.locales);
  }

  listRoutes(): { items: LocalizationRoute[]; page: number; page_size: number; total: number } {
    return paginate(this.routes);
  }

  listCategories(query: CatalogCategoryListQuery): { items: CatalogCategory[]; page: number; page_size: number; total: number } {
    const filtered = this.categories.filter((category) => {
      if (query.status && category.status !== query.status) return false;
      if (query.parent_id !== undefined && category.parent_id !== query.parent_id) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    return paginate(filtered.sort((left, right) => left.sort_order - right.sort_order), page, pageSize);
  }

  upsertCategory(
    input:
      | CatalogCategoryCreateInput
      | (Partial<CatalogCategoryCreateInput> & { id?: number }),
  ): CatalogCategory {
    if ("id" in input && input.id) {
      const index = this.categories.findIndex((category) => category.id === input.id);
      if (index < 0) {
        throw new NotFoundException("分类不存在");
      }
      const current = this.categories[index]!;
      const next: CatalogCategory = {
        ...current,
        parent_id: input.parent_id !== undefined ? input.parent_id : current.parent_id,
        slug: input.slug ?? current.slug,
        name: input.name ?? current.name,
        status: input.status ?? current.status,
        sort_order: input.sort_order ?? current.sort_order,
        localized_content: input.localized_content ?? current.localized_content,
        updated_at: nowIso(),
      };
      this.categories[index] = next;
      return clone(next);
    }

    const createInput = input as CatalogCategoryCreateInput;
    const category: CatalogCategory = {
      id: this.categorySeq++,
      parent_id: createInput.parent_id ?? null,
      slug: createInput.slug,
      name: createInput.name,
      status: createInput.status ?? "active",
      sort_order: createInput.sort_order ?? 0,
      localized_content: clone(createInput.localized_content ?? {}),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.categories.push(category);
    return clone(category);
  }

  listProducts(query: CatalogProductListQuery): { items: CatalogProduct[]; page: number; page_size: number; total: number } {
    const filtered = this.products.filter((product) => {
      if (query.status && product.status !== query.status) return false;
      if (query.category_id && product.primary_category_id !== query.category_id && !product.category_ids.includes(query.category_id)) return false;
      if (query.market) {
        const markets = (product.market_visibility as { markets?: string[] }).markets ?? [];
        if (markets.length && !markets.includes(query.market)) return false;
      }
      if (query.locale) {
        const localized = product.localized_content as Record<string, JsonValue>;
        if (!localized[query.locale] && query.locale !== "en-US") {
          return false;
        }
      }
      if (query.q) {
        const term = lower(query.q);
        const haystack = [
          product.slug,
          product.name,
          product.short_description,
          ...product.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      switch (query.sort) {
        case "name_asc":
          return left.name.localeCompare(right.name);
        case "name_desc":
          return right.name.localeCompare(left.name);
        case "newest":
          return right.updated_at.localeCompare(left.updated_at);
        default:
          return right.updated_at.localeCompare(left.updated_at);
      }
    });

    return paginate(sorted, query.page, query.page_size);
  }

  getProductById(productId: number): CatalogProduct {
    const product = this.products[this.getProductIndex(productId)]!;
    return clone(product);
  }

  getProductBySlug(slug: string): CatalogProduct {
    const product = this.products.find((entry) => entry.slug === slug);
    if (!product) {
      throw new NotFoundException("商品不存在");
    }
    return clone(product);
  }

  getCategoryById(categoryId: number): CatalogCategory {
    const category = this.categories.find((entry) => entry.id === categoryId);
    if (!category) {
      throw new NotFoundException("分类不存在");
    }
    return clone(category);
  }

  upsertProduct(
    input: CatalogProductCreateInput | (CatalogProductUpdateInput & { id?: number }),
  ): CatalogProduct {
    if ("id" in input && input.id) {
      const index = this.getProductIndex(input.id);
      const current = this.products[index]!;
      const next = {
        ...current,
        slug: input.slug ?? current.slug,
        name: input.name ?? current.name,
        short_description: input.short_description ?? current.short_description,
        description:
          input.description !== undefined ? input.description : current.description,
        age_min: input.age_min !== undefined ? input.age_min : current.age_min,
        age_max: input.age_max !== undefined ? input.age_max : current.age_max,
        tags: input.tags ?? current.tags,
        primary_image_url:
          input.primary_image_url !== undefined
            ? input.primary_image_url
            : current.primary_image_url,
        status: input.status ?? current.status,
        primary_category_id:
          input.primary_category_id ?? current.primary_category_id,
        category_ids: input.category_ids ?? current.category_ids,
        market_visibility:
          input.market_visibility ?? current.market_visibility,
        localized_content:
          input.localized_content ?? current.localized_content,
        media_asset_ids: input.media_asset_ids ?? current.media_asset_ids,
        related_product_ids:
          input.related_product_ids ?? current.related_product_ids,
        variants: input.variants
          ? input.variants.map((variant, variantIndex) => ({
              id: current.variants[variantIndex]?.id ?? this.productSeq++,
              product_id: current.id,
              sku: variant.sku,
              barcode: variant.barcode ?? null,
              options: clone(variant.options),
              specifications: clone(variant.specifications),
              status: variant.status,
              primary_image_url: variant.primary_image_url ?? null,
              created_at: current.variants[variantIndex]?.created_at ?? nowIso(),
              updated_at: nowIso(),
            }))
          : current.variants,
        updated_at: nowIso(),
      } satisfies CatalogProduct;
      this.products[index] = next;
      return clone(next);
    }

    const createInput = input as CatalogProductCreateInput;
    if (
      this.products.some(
        (product) =>
          product.slug.toLowerCase() === createInput.slug.toLowerCase(),
      )
    ) {
      throw new ConflictException("商品 slug 已存在");
    }
    for (const variant of createInput.variants) {
      if (this.findVariantBySku(variant.sku)) {
        throw new ConflictException("SKU 已存在");
      }
    }
    const product = this.createSeedProduct(createInput);
    this.products.push(product);
    return clone(product);
  }

  publishProduct(productId: number): CatalogProduct {
    const index = this.getProductIndex(productId);
    const current = this.products[index]!;
    const next: CatalogProduct = {
      ...current,
      status: "active",
      published_at: nowIso(),
      updated_at: nowIso(),
    };
    this.products[index] = next;
    return clone(next);
  }

  archiveProduct(productId: number): CatalogProduct {
    const index = this.getProductIndex(productId);
    const current = this.products[index]!;
    const next: CatalogProduct = {
      ...current,
      status: "archived",
      archived_at: nowIso(),
      updated_at: nowIso(),
    };
    this.products[index] = next;
    return clone(next);
  }

  listVariants(): CatalogVariant[] {
    return this.products.flatMap((product) => product.variants).map((variant) => clone(variant));
  }

  findVariantBySku(sku: string): CatalogVariant | null {
    const product = this.products.find((entry) =>
      entry.variants.some((variant) => variant.sku.toLowerCase() === sku.toLowerCase()),
    );
    if (!product) {
      return null;
    }
    const variant = product.variants.find(
      (entry) => entry.sku.toLowerCase() === sku.toLowerCase(),
    );
    return variant ? clone(variant) : null;
  }

  getVariantById(variantId: number): CatalogVariant {
    return clone(this.resolveVariantById(variantId));
  }

  listContentEntries(query: ContentEntryListQuery): { items: ContentEntry[]; page: number; page_size: number; total: number } {
    const filtered = this.contentEntries.filter((entry) => {
      if (query.type && entry.type !== query.type) return false;
      if (query.status && entry.status !== query.status) return false;
      if (query.locale && entry.locale !== query.locale) return false;
      if (query.market && entry.market !== query.market) return false;
      if (query.q) {
        const term = lower(query.q);
        const haystack = [
          entry.slug,
          entry.title,
          JSON.stringify(entry.body),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return paginate(
      filtered.sort((left, right) => right.updated_at.localeCompare(left.updated_at)),
      query.page,
      query.page_size,
    );
  }

  getContentEntryBySlug(slug: string, type?: ContentEntry["type"]): ContentEntry {
    const entry = this.contentEntries.find((candidate) => {
      if (candidate.slug !== slug) return false;
      if (type && candidate.type !== type) return false;
      return true;
    });
    if (!entry) {
      throw new NotFoundException("内容不存在");
    }
    return clone(entry);
  }

  getContentEntryById(contentId: number): ContentEntry {
    return clone(this.contentEntries[this.getContentIndex(contentId)]!);
  }

  upsertContentEntry(
    input: ContentEntryCreateInput | (ContentEntryUpdateInput & { id?: number }),
  ): ContentEntry {
    if ("id" in input && input.id) {
      const index = this.getContentIndex(input.id);
      const current = this.contentEntries[index]!;
      const next: ContentEntry = {
        ...current,
        type: input.type ?? current.type,
        slug: input.slug ?? current.slug,
        title: input.title ?? current.title,
        body: input.body ?? current.body,
        seo: input.seo ?? current.seo,
        status: input.status ?? current.status,
        locale: input.locale ?? current.locale,
        market: input.market ?? current.market,
        translation_status:
          input.translation_status ?? current.translation_status,
        linked_product_ids:
          input.linked_product_ids ?? current.linked_product_ids,
        media_asset_ids: input.media_asset_ids ?? current.media_asset_ids,
        published_at:
          input.status === "published" ? current.published_at ?? nowIso() : current.published_at,
        archived_at:
          input.status === "archived" ? nowIso() : current.archived_at,
        updated_at: nowIso(),
      };
      this.contentEntries[index] = next;
      return clone(next);
    }

    const createInput = input as ContentEntryCreateInput;
    if (
      this.contentEntries.some(
        (entry) =>
          entry.type === createInput.type &&
          entry.slug.toLowerCase() === createInput.slug.toLowerCase() &&
          entry.locale === createInput.locale &&
          entry.market === createInput.market,
      )
    ) {
      throw new ConflictException("内容 slug 已存在");
    }

    const entry: ContentEntry = {
      id: this.contentSeq++,
      type: createInput.type,
      slug: createInput.slug,
      title: createInput.title,
      body: clone(createInput.body ?? {}),
      seo: clone(createInput.seo),
      status: createInput.status ?? "draft",
      locale: createInput.locale,
      market: createInput.market,
      translation_status: createInput.translation_status ?? "not_started",
      linked_product_ids: [...(createInput.linked_product_ids ?? [])],
      media_asset_ids: [...(createInput.media_asset_ids ?? [])],
      published_at: createInput.status === "published" ? nowIso() : null,
      archived_at: createInput.status === "archived" ? nowIso() : null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.contentEntries.push(entry);
    return clone(entry);
  }

  publishContentEntry(contentId: number): ContentEntry {
    const index = this.getContentIndex(contentId);
    const current = this.contentEntries[index]!;
    const next: ContentEntry = {
      ...current,
      status: "published",
      translation_status: "published",
      published_at: nowIso(),
      updated_at: nowIso(),
    };
    this.contentEntries[index] = next;
    return clone(next);
  }

  archiveContentEntry(contentId: number): ContentEntry {
    const index = this.getContentIndex(contentId);
    const current = this.contentEntries[index]!;
    const next: ContentEntry = {
      ...current,
      status: "archived",
      archived_at: nowIso(),
      updated_at: nowIso(),
    };
    this.contentEntries[index] = next;
    return clone(next);
  }

  listNavigation(): ContentNavigation[] {
    const items = this.contentEntries
      .filter((entry) => entry.type === "navigation" && entry.status === "published")
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        market: entry.market,
        locale: entry.locale,
        status: entry.status,
        items: ((entry.body as { items?: ContentNavigation["items"] }).items ?? []).map(
          (item) => ({
            id: item.id,
            label: item.label,
            path: item.path,
            order: item.order,
            children: item.children ?? [],
          }),
        ),
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      }));
    return items.map((item) => clone(item));
  }

  listMediaAssets(query: MediaAssetListQuery): { items: MediaAsset[]; page: number; page_size: number; total: number } {
    const filtered = this.mediaAssets.filter((asset) => {
      if (query.visibility && asset.visibility !== query.visibility) return false;
      if (query.type && asset.type !== query.type) return false;
      if (query.q) {
        const term = lower(query.q);
        const haystack = [
          asset.file_key,
          asset.alt,
          asset.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  createMediaAsset(input: MediaAssetCreateInput): MediaAsset {
    if (this.mediaAssets.some((asset) => asset.file_key === input.file_key)) {
      throw new ConflictException("媒体文件已存在");
    }
    const created_at = nowIso();
    const asset: MediaAsset = {
      id: this.mediaSeq++,
      type: input.type,
      file_key: input.file_key,
      mime: input.mime,
      size: input.size,
      checksum: input.checksum,
      alt: input.alt ?? null,
      visibility: input.visibility,
      tags: [...input.tags],
      versions: [
        {
          version: "1",
          file_key: input.file_key,
          mime: input.mime,
          size: input.size,
          checksum: input.checksum,
          created_at,
        },
      ],
      metadata: clone(input.metadata ?? {}),
      created_at,
      updated_at: created_at,
    };
    this.mediaAssets.push(asset);
    return clone(asset);
  }

  getMediaAsset(id: number): MediaAsset {
    return clone(this.mediaAssets[this.getMediaIndex(id)]!);
  }

  signMediaAsset(id: number): {
    asset_id: number;
    url: string;
    expires_at: string;
    method: "GET";
  } {
    const asset = this.mediaAssets[this.getMediaIndex(id)]!;
    return {
      asset_id: asset.id,
      url: `https://media.wemove.local/${asset.file_key}?signature=${asset.checksum}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      method: "GET",
    };
  }

  search(query: SearchQuery): { items: SearchHit[]; page: number; page_size: number; total: number } {
    const term = query.q.toLowerCase();
    const results: SearchHit[] = [];

    for (const product of this.products) {
      if (product.status !== "active") continue;
      if (query.type && query.type !== "product") continue;
      const markets = (product.market_visibility as { markets?: string[] }).markets ?? [];
      if (query.market && markets.length && !markets.includes(query.market)) continue;
      const haystack = [
        product.slug,
        product.name,
        product.short_description,
        product.description ?? "",
        ...product.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) continue;
      results.push({
        entity_type: "product",
        entity_id: product.id,
        slug: product.slug,
        title: product.name,
        snippet: product.short_description,
        url: urlForProduct(product.slug),
        market: query.market ?? "global",
        locale: query.locale ?? "en-US",
        status: product.status,
        score: 100 - results.length,
        primary_image_url: product.primary_image_url,
      });
    }

    for (const entry of this.contentEntries) {
      if (entry.status !== "published") continue;
      if (query.type && query.type === "product") continue;
      if (query.type && query.type !== entry.type && query.type !== "page") continue;
      if (query.market && entry.market !== query.market) continue;
      if (query.locale && entry.locale !== query.locale) continue;
      const haystack = [entry.slug, entry.title, JSON.stringify(entry.body)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) continue;
      results.push({
        entity_type:
          entry.type === "article"
            ? "article"
            : entry.type === "faq"
              ? "faq"
              : entry.type === "download"
                ? "download"
                : "page",
        entity_id: entry.id,
        slug: entry.slug,
        title: entry.title,
        snippet: typeof entry.body === "string" ? entry.body : entry.title,
        url: urlForContent(entry.type, entry.slug),
        market: entry.market,
        locale: entry.locale,
        status: entry.status,
        score: 90 - results.length,
        primary_image_url: this.getPrimaryImageForContent(entry),
      });
    }

    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    return paginate(results.sort((left, right) => right.score - left.score), page, pageSize);
  }

  suggest(query: SearchQuery): { q: string; suggestions: string[] } {
    const term = query.q.toLowerCase();
    const suggestions = new Set<string>();
    for (const product of this.products) {
      if (product.status !== "active") continue;
      if (product.name.toLowerCase().includes(term)) suggestions.add(product.name);
      if (product.slug.toLowerCase().includes(term)) suggestions.add(product.slug);
    }
    for (const entry of this.contentEntries) {
      if (entry.status !== "published") continue;
      if (entry.title.toLowerCase().includes(term)) suggestions.add(entry.title);
      if (entry.slug.toLowerCase().includes(term)) suggestions.add(entry.slug);
    }
    return { q: query.q, suggestions: [...suggestions].slice(0, 8) };
  }

  buildSeoMetadata(path: string, market = "global", locale = "en-US"): {
    title: string;
    description: string;
    canonical_url?: string;
    og_title?: string;
    og_description?: string;
    og_image_url?: string;
    indexable: boolean;
  } {
    const product = this.products.find((entry) => urlForProduct(entry.slug) === path);
    if (product) {
      const seo: {
        title: string;
        description: string;
        canonical_url?: string;
        og_title?: string;
        og_description?: string;
        og_image_url?: string;
        indexable: boolean;
      } = {
        title: product.name,
        description: product.short_description,
        canonical_url: `https://www.wemovetoy.com${path}`,
        og_title: product.name,
        og_description: product.short_description,
        indexable: product.status === "active",
      };
      if (product.primary_image_url) {
        seo.og_image_url = product.primary_image_url;
      }
      return seo;
    }

    const content = this.contentEntries.find((entry) => urlForContent(entry.type, entry.slug) === path);
    if (content) {
      const seo: {
        title: string;
        description: string;
        canonical_url?: string;
        og_title?: string;
        og_description?: string;
        og_image_url?: string;
        indexable: boolean;
      } = {
        title: content.seo.title,
        description: content.seo.description,
        canonical_url: content.seo.canonical_url ?? `https://www.wemovetoy.com${path}`,
        og_title: content.seo.og_title ?? content.seo.title,
        og_description: content.seo.og_description ?? content.seo.description,
        indexable: content.seo.indexable,
      };
      if (content.seo.og_image_url) {
        seo.og_image_url = content.seo.og_image_url;
      }
      return seo;
    }

    return {
      title: `WEMOVE SPORTS - ${market}`,
      description: `Fallback metadata for ${locale}`,
      canonical_url: `https://www.wemovetoy.com${path}`,
      indexable: false,
    };
  }

  buildSitemap(): { generated_at: string; entries: SeoSitemapEntry[] } {
    const entries: SeoSitemapEntry[] = [
      ...this.products
        .filter((product) => product.status === "active")
        .map((product) => ({
          url: `https://www.wemovetoy.com${urlForProduct(product.slug)}`,
          lastmod: product.updated_at,
          locale: "en-US",
          market: "global",
          changefreq: "weekly" as const,
          priority: 0.8,
        })),
      ...this.contentEntries
        .filter((entry) => entry.status === "published")
        .map((entry) => ({
          url: `https://www.wemovetoy.com${urlForContent(entry.type, entry.slug)}`,
          lastmod: entry.updated_at,
          locale: entry.locale,
          market: entry.market,
          changefreq: "monthly" as const,
          priority: entry.type === "page" ? 1 : 0.5,
        })),
    ];

    return {
      generated_at: nowIso(),
      entries,
    };
  }

  listRedirects(): { items: SeoRedirect[]; page: number; page_size: number; total: number } {
    return paginate(this.redirects.sort((left, right) => right.updated_at.localeCompare(left.updated_at)));
  }

  upsertRedirect(input: SeoRedirectCreateInput | (SeoRedirectCreateInput & { id?: number })): SeoRedirect {
    if ("id" in input && input.id) {
      const index = this.redirects.findIndex((entry) => entry.id === input.id);
      if (index < 0) throw new NotFoundException("重定向不存在");
      const current = this.redirects[index]!;
      const next: SeoRedirect = {
        ...current,
        source_path: input.source_path ?? current.source_path,
        target_path: input.target_path ?? current.target_path,
        status_code: input.status_code ?? current.status_code,
        updated_at: nowIso(),
      };
      this.redirects[index] = next;
      return clone(next);
    }

    if (this.redirects.some((entry) => entry.source_path === input.source_path)) {
      throw new ConflictException("重定向已存在");
    }
    const redirect: SeoRedirect = {
      id: this.redirectSeq++,
      source_path: input.source_path,
      target_path: input.target_path,
      status_code: input.status_code ?? 301,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.redirects.push(redirect);
    return clone(redirect);
  }

  listFormSubmissions(query: FormSubmissionListQuery): { items: FormSubmission[]; page: number; page_size: number; total: number } {
    const filtered = this.formSubmissions.filter((entry) => {
      if (query.type && entry.type !== query.type) return false;
      if (query.status && entry.status !== query.status) return false;
      if (query.assignee_id && entry.assignee_id !== query.assignee_id) return false;
      return true;
    });

    return paginate(
      filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)),
      query.page,
      query.page_size,
    );
  }

  getFormSubmissionById(submissionId: number): FormSubmission {
    return clone(this.formSubmissions[this.getSubmissionIndex(submissionId)]!);
  }

  createFormSubmission(input: FormSubmissionCreateInput & { request_id: string }): FormSubmission {
    if (
      this.formSubmissions.some(
        (entry) => entry.request_id === input.request_id && entry.type === input.type,
      )
    ) {
      const existing = this.formSubmissions.find(
        (entry) => entry.request_id === input.request_id && entry.type === input.type,
      );
      if (existing) {
        return clone(existing);
      }
    }

    const created_at = nowIso();
    const submission: FormSubmission = {
      id: this.submissionSeq++,
      submission_no: `FS-${String(this.submissionSeq - 1).padStart(6, "0")}`,
      type: input.type,
      source: input.source,
      payload: clone(input.payload),
      attachments: [...input.attachments],
      assignee_id: null,
      priority: input.priority,
      tags: [...input.tags],
      internal_note: null,
      status: "new",
      request_id: input.request_id,
      created_at,
      updated_at: created_at,
      history: [
        {
          status: "new",
          note: null,
          actor_id: null,
          request_id: input.request_id,
          created_at,
        },
      ],
    };
    this.formSubmissions.push(submission);
    this.recordNotificationDelivery({
      template_code: "form_received",
      recipient_user_id: null,
      company_id: null,
      audience: "staff",
      channel: "email",
      request_id: input.request_id,
      payload: {
        submission_no: submission.submission_no,
        type: submission.type,
      },
      status: "queued",
    });
    return clone(submission);
  }

  updateFormSubmission(id: number, input: FormSubmissionUpdateInput, request_id: string, actor_id: number | null): FormSubmission {
    const index = this.getSubmissionIndex(id);
    const current = this.formSubmissions[index]!;
    const nextStatus = input.status ?? current.status;
    const next: FormSubmission = {
      ...current,
      assignee_id:
        input.assignee_id !== undefined ? input.assignee_id : current.assignee_id,
      priority: input.priority ?? current.priority,
      tags: input.tags ?? current.tags,
      internal_note:
        input.internal_note !== undefined ? input.internal_note : current.internal_note,
      status: nextStatus,
      updated_at: nowIso(),
      history: [
        ...current.history,
        {
          status: nextStatus,
          note: input.internal_note ?? null,
          actor_id,
          request_id,
          created_at: nowIso(),
        },
      ],
    };
    this.formSubmissions[index] = next;
    return clone(next);
  }

  listNotificationTemplates(): { items: NotificationTemplate[]; page: number; page_size: number; total: number } {
    return paginate(
      this.notificationTemplates.sort((left, right) =>
        left.code.localeCompare(right.code),
      ),
    );
  }

  upsertNotificationTemplate(input: NotificationTemplateCreateInput | (NotificationTemplateCreateInput & { id?: number })): NotificationTemplate {
    if ("id" in input && input.id) {
      const index = this.notificationTemplates.findIndex((entry) => entry.id === input.id);
      if (index < 0) throw new NotFoundException("通知模板不存在");
      const current = this.notificationTemplates[index]!;
      const next: NotificationTemplate = {
        ...current,
        code: input.code ?? current.code,
        audience: input.audience ?? current.audience,
        channel: input.channel ?? current.channel,
        locale: input.locale ?? current.locale,
        subject: input.subject ?? current.subject,
        body: input.body ?? current.body,
        variables: input.variables ?? current.variables,
        category: input.category ?? current.category,
        active: input.active ?? current.active,
        updated_at: nowIso(),
      };
      this.notificationTemplates[index] = next;
      return clone(next);
    }

    const existing = this.notificationTemplates.find(
      (entry) =>
        entry.code === input.code &&
        entry.channel === input.channel &&
        entry.locale === input.locale,
    );
    if (existing) {
      return clone(existing);
    }

    const template = this.createSeedTemplate(input);
    this.notificationTemplates.push(template);
    return clone(template);
  }

  getNotificationTemplateById(templateId: number): NotificationTemplate {
    const index = this.notificationTemplates.findIndex((entry) => entry.id === templateId);
    if (index < 0) throw new NotFoundException("通知模板不存在");
    return clone(this.notificationTemplates[index]!);
  }

  listNotificationDeliveries(query: NotificationDeliveryListQuery): { items: NotificationDelivery[]; page: number; page_size: number; total: number } {
    const filtered = this.notificationDeliveries.filter((entry) => {
      if (query.recipient_user_id && entry.recipient_user_id !== query.recipient_user_id) return false;
      if (query.company_id && entry.company_id !== query.company_id) return false;
      if (query.audience && entry.audience !== query.audience) return false;
      if (query.status && entry.status !== query.status) return false;
      return true;
    });
    return paginate(
      filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)),
      query.page,
      query.page_size,
    );
  }

  getNotificationDeliveryById(deliveryId: number): NotificationDelivery {
    return clone(this.notificationDeliveries[this.getNotificationDeliveryIndex(deliveryId)]!);
  }

  recordNotificationDelivery(input: NotificationDeliveryCreateInput): NotificationDelivery {
    const dedupeKey = [
      input.template_code,
      input.recipient_user_id ?? "null",
      input.company_id ?? "null",
      input.channel,
      input.request_id,
    ].join(":");
    const existingId = this.deliveryIdempotency.get(dedupeKey);
    if (existingId) {
      const existing = this.notificationDeliveries.find((entry) => entry.id === existingId);
      if (existing) {
        return clone(existing);
      }
    }

    const created_at = nowIso();
    const delivery: NotificationDelivery = {
      id: this.deliverySeq++,
      template_code: input.template_code,
      recipient_user_id: input.recipient_user_id ?? null,
      company_id: input.company_id ?? null,
      audience: input.audience,
      channel: input.channel,
      status: input.status ?? "queued",
      request_id: input.request_id,
      payload: clone(input.payload),
      attempts: 1,
      provider_message_id: input.provider_message_id ?? null,
      failure_reason: input.failure_reason ?? null,
      created_at,
      sent_at: input.status === "sent" ? created_at : null,
      updated_at: created_at,
    };
    this.notificationDeliveries.push(delivery);
    this.deliveryIdempotency.set(dedupeKey, delivery.id);
    return clone(delivery);
  }

  retryNotificationDelivery(id: number, request_id: string, reason?: string): NotificationDelivery {
    const index = this.getNotificationDeliveryIndex(id);
    const current = this.notificationDeliveries[index]!;
    const next: NotificationDelivery = {
      ...current,
      status: "retrying",
      attempts: current.attempts + 1,
      failure_reason: reason ?? current.failure_reason,
      updated_at: nowIso(),
      request_id,
    };
    this.notificationDeliveries[index] = next;
    return clone(next);
  }

  private getPrimaryImageForContent(entry: ContentEntry): string | null {
    if (entry.media_asset_ids.length === 0) {
      return null;
    }
    const asset = this.mediaAssets.find((candidate) => candidate.id === entry.media_asset_ids[0]);
    return asset ? `https://media.wemove.local/${asset.file_key}` : null;
  }
}
