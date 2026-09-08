import {
  type CatalogProduct,
  type CatalogProductListQuery,
} from "@wemo/contracts";

import { ApiError } from "../platform/api-client";

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
    primary_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5LU_83Pxty5O-PdOFUh5IjTYFQ3AvgaE4WcgytxApZuMB3TMI1TVmyN0ChbS0lOoU-jgzbBcMnt0mlUMFkvrnufTzZX3RTq1VNPUGaewobf4U-qENo7GtwkQc5msxidKbmFDZkUnQzpFPrOLF4QNakNmpmKgaFrrcLRgLKPEFbwa9P3ri1OpJeRou_amKyRemYs6SZc6DIDE0DbY9dQgv-htc2iahmJxpZI4RCZUJsX4LeN_KFKKB",
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
    primary_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2WjUyv4FcCl4NfPfYkW7BUFqWk_gtPPg-vzMayPj_MIS4__hy4hSMq23ltj1EmQYjn9x41gfUh9PY9C5o8RB9lyc8URyOR8N_KB12ZpMazIskrvQM5tohQZc5yUaZbigYZN9CsefI3fkEpKzLwHnxI3BLgxatC4izJKNXG3nC7f5UkPh4udzYrGM0R6Z7hVNT7Kls9BFKaW_zuAUxogW4__-ghB8DrxVmrUGNiPNaebzYH0bHIcbN",
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
    primary_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtkgeVXxXim-Llfpyk5Ytzp7FANRXFPzL-K_UYWJ3bznLnHtJZWJIYcoTmVT2sFW3ABqaIMSNPU6xbtdpAqB8pkaNM89MaBgZRhsfFNE9I9MesZBt23DWtWeHF98PCQJ7fAPkjuJcDMPiVVbQ8Y2ieZZztvodyHzfDBmo3XDrEI98R4EVSlQ-IQqMCq9vAJUWa0cTyAyRsO1KoPzlhmWPxT7faTHQY8Vt-RI71sPJfx21qyEnO01PM",
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
  const items = filterPreviewProducts(query);
  const page = query.page ?? 1;
  const pageSize = query.page_size ?? 24;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    error: undefined,
    preview: true,
  };
}

export async function getPublicProduct(slug: string): Promise<{
  product: CatalogProduct | null;
  error: ApiError | undefined;
  preview: boolean;
}> {
  return {
    product: previewProducts.find((product) => product.slug === slug) ?? null,
    error: undefined,
    preview: true,
  };
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
