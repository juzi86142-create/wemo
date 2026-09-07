import {
  CatalogProductListResponseSchema,
  CatalogProductResponseSchema,
  type CatalogProduct,
  type CatalogProductListQuery,
} from "@wemo/contracts";

import { ApiError, requestJson, toQueryString } from "../platform/api-client";

const previewProducts: CatalogProduct[] = [
  {
    id: 101,
    slug: "roll-play-bowling-set",
    name: "Roll & Play Bowling Set",
    short_description: "A joyful first roll for family play.",
    description: "A lightweight bowling set that turns any room or garden into a friendly lane.",
    age_min: 3,
    age_max: 8,
    tags: ["coordination", "indoor", "family"],
    primary_image_url: null,
    status: "active",
    primary_category_id: 1,
    category_ids: [1],
    market_visibility: { market: "global" },
    localized_content: { language: "en" },
    media_asset_ids: [],
    related_product_ids: [102],
    variants: [
      {
        id: 1001,
        product_id: 101,
        sku: "WEMO-RPB-01",
        barcode: null,
        options: { color: "signal" },
        specifications: { pieces: 7 },
        status: "active",
        primary_image_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    published_at: "2026-01-01T00:00:00.000Z",
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 102,
    slug: "steady-balance-board",
    name: "Steady Balance Board",
    short_description: "Small steps toward confident movement.",
    description: "A tactile balance challenge designed for playful movement and growing confidence.",
    age_min: 4,
    age_max: 10,
    tags: ["balance", "movement", "outdoor"],
    primary_image_url: null,
    status: "active",
    primary_category_id: 2,
    category_ids: [2],
    market_visibility: { market: "global" },
    localized_content: { language: "en" },
    media_asset_ids: [],
    related_product_ids: [101],
    variants: [
      {
        id: 1002,
        product_id: 102,
        sku: "WEMO-SBB-01",
        barcode: null,
        options: { color: "blue" },
        specifications: { material: "recycled polymer" },
        status: "active",
        primary_image_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    published_at: "2026-01-01T00:00:00.000Z",
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 103,
    slug: "orbit-target-toss",
    name: "Orbit Target Toss",
    short_description: "Aim, adapt, and make your own rules.",
    description: "A flexible target game for garden parties, play dates, and friendly family tournaments.",
    age_min: 5,
    age_max: 12,
    tags: ["aim", "outdoor", "group play"],
    primary_image_url: null,
    status: "active",
    primary_category_id: 3,
    category_ids: [3],
    market_visibility: { market: "global" },
    localized_content: { language: "en" },
    media_asset_ids: [],
    related_product_ids: [101, 102],
    variants: [
      {
        id: 1003,
        product_id: 103,
        sku: "WEMO-OTT-01",
        barcode: null,
        options: { color: "lime" },
        specifications: { pieces: 10 },
        status: "active",
        primary_image_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    published_at: "2026-01-01T00:00:00.000Z",
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

const previewAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW === "true";

export interface CatalogPageData {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number;
  error: ApiError | undefined;
  preview: boolean;
}

function filterPreviewProducts(query: CatalogProductListQuery) {
  const search = query.q?.toLowerCase();
  const filtered = previewProducts.filter((product) => {
    if (!search) return true;
    return [product.name, product.short_description, ...product.tags]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  if (query.sort === "name_desc") return [...filtered].sort((a, b) => b.name.localeCompare(a.name));
  if (query.sort === "name_asc") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  if (query.sort === "newest") return [...filtered].reverse();
  return filtered;
}

export async function getPublicProducts(
  query: CatalogProductListQuery = { page: 1, page_size: 24 },
): Promise<CatalogPageData> {
  try {
    const response = CatalogProductListResponseSchema.parse(
      await requestJson<unknown>("/catalog/products?" + toQueryString(query)),
    );
    return {
      items: response.items,
      page: response.page,
      pageSize: response.page_size,
      total: response.total,
      error: undefined,
      preview: false,
    };
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError("The product catalogue is unavailable.", 0);
    const previewItems = filterPreviewProducts(query);

    return {
      items: previewAllowed ? previewItems : [],
      page: query.page ?? 1,
      pageSize: query.page_size ?? 24,
      total: previewAllowed ? previewItems.length : 0,
      error: apiError,
      preview: previewAllowed,
    };
  }
}

export async function getPublicProduct(slug: string) {
  try {
    const response = CatalogProductResponseSchema.parse(
      await requestJson<unknown>("/catalog/products/" + encodeURIComponent(slug)),
    );
    return { product: response.item, error: undefined, preview: false };
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError("The product is unavailable.", 0);
    return {
      product: previewAllowed
        ? previewProducts.find((product) => product.slug === slug) ?? null
        : null,
      error: apiError,
      preview: previewAllowed,
    };
  }
}

export function getPreviewProducts() {
  return previewProducts;
}

export function formatAgeRange(ageMin: number | null, ageMax: number | null) {
  if (ageMin === null && ageMax === null) return "All ages";
  if (ageMin === null) return "Up to " + ageMax;
  if (ageMax === null) return ageMin + "+";
  return ageMin + "–" + ageMax;
}

export function getProductImageAlt(product: CatalogProduct) {
  return product.name + " from WEMOVE SPORTS";
}
