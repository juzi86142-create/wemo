import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  PaginationSchema,
} from "../common/index.js";

export const ProductStatusSchema = z.enum([
  "draft",
  "scheduled",
  "active",
  "hidden",
  "archived",
]);

export const CatalogVariantSchema = z
  .object({
    id: EntityIdSchema,
    product_id: EntityIdSchema,
    sku: z.string().min(1),
    barcode: z.string().min(1).nullable(),
    options: JsonValueSchema,
    specifications: JsonValueSchema,
    status: z.string().min(1),
    primary_image_url: z.string().url().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const CatalogCategorySchema = z
  .object({
    id: EntityIdSchema,
    parent_id: EntityIdSchema.nullable(),
    slug: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
    sort_order: z.number().int(),
    localized_content: JsonValueSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

const CatalogVariantInputSchema = z
  .object({
    sku: z.string().min(1),
    barcode: z.string().min(1).optional().nullable(),
    options: JsonValueSchema,
    specifications: JsonValueSchema,
    status: z.string().min(1),
    primary_image_url: z.string().url().optional().nullable(),
  })
  .strict();

export const CatalogProductSchema = z
  .object({
    id: EntityIdSchema,
    slug: z.string().min(1),
    name: z.string().min(1),
    short_description: z.string(),
    description: z.string().nullable(),
    age_min: z.number().int().nonnegative().nullable(),
    age_max: z.number().int().nonnegative().nullable(),
    tags: z.array(z.string().min(1)),
    primary_image_url: z.string().url().nullable(),
    status: ProductStatusSchema,
    primary_category_id: EntityIdSchema,
    category_ids: z.array(EntityIdSchema),
    market_visibility: JsonValueSchema,
    localized_content: JsonValueSchema,
    media_asset_ids: z.array(EntityIdSchema),
    related_product_ids: z.array(EntityIdSchema),
    variants: z.array(CatalogVariantSchema),
    published_at: z.string().datetime().nullable(),
    archived_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const CatalogCategoryCreateSchema = z
  .object({
    parent_id: EntityIdSchema.nullable().optional(),
    slug: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1).optional(),
    sort_order: z.number().int().optional(),
    localized_content: JsonValueSchema.default({}),
  })
  .strict();

export const CatalogCategoryUpdateSchema = z
  .object({
    parent_id: EntityIdSchema.nullable().optional(),
    slug: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    sort_order: z.number().int().optional(),
    localized_content: JsonValueSchema.optional(),
  })
  .strict();

export const CatalogCategoryListQuerySchema = PaginationSchema.extend({
  parent_id: EntityIdSchema.optional(),
  status: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
});

export const CatalogProductCreateSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    short_description: z.string(),
    description: z.string().nullable().optional(),
    age_min: z.number().int().nonnegative().nullable().optional(),
    age_max: z.number().int().nonnegative().nullable().optional(),
    tags: z.array(z.string().min(1)),
    primary_image_url: z.string().url().nullable().optional(),
    status: ProductStatusSchema.optional(),
    primary_category_id: EntityIdSchema,
    category_ids: z.array(EntityIdSchema),
    market_visibility: JsonValueSchema,
    localized_content: JsonValueSchema.default({}),
    media_asset_ids: z.array(EntityIdSchema).default([]),
    related_product_ids: z.array(EntityIdSchema).default([]),
    variants: z.array(CatalogVariantInputSchema).min(1),
  })
  .strict();

export const CatalogProductUpdateSchema = z
  .object({
    slug: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    short_description: z.string().optional(),
    description: z.string().nullable().optional(),
    age_min: z.number().int().nonnegative().nullable().optional(),
    age_max: z.number().int().nonnegative().nullable().optional(),
    tags: z.array(z.string().min(1)).optional(),
    primary_image_url: z.string().url().nullable().optional(),
    status: ProductStatusSchema.optional(),
    primary_category_id: EntityIdSchema.optional(),
    category_ids: z.array(EntityIdSchema).optional(),
    market_visibility: JsonValueSchema.optional(),
    localized_content: JsonValueSchema.optional(),
    media_asset_ids: z.array(EntityIdSchema).optional(),
    related_product_ids: z.array(EntityIdSchema).optional(),
    variants: z.array(CatalogVariantInputSchema).optional(),
  })
  .strict();

export const CatalogProductListQuerySchema = PaginationSchema.extend({
  status: ProductStatusSchema.optional(),
  category_id: EntityIdSchema.optional(),
  market: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  sort: z.enum(["name_asc", "name_desc", "newest"]).optional(),
});

export const CatalogCategoryListResponseSchema =
  createListResponseSchema(CatalogCategorySchema);
export const CatalogCategoryMutationResponseSchema =
  createItemResponseSchema(CatalogCategorySchema);

export const CatalogProductListResponseSchema =
  createListResponseSchema(CatalogProductSchema);
export const CatalogProductMutationResponseSchema =
  createItemResponseSchema(CatalogProductSchema);
export const CatalogProductResponseSchema =
  createItemResponseSchema(CatalogProductSchema);
export const CatalogVariantListResponseSchema =
  createListResponseSchema(CatalogVariantSchema);

export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export type CatalogCategoryCreateInput = z.infer<
  typeof CatalogCategoryCreateSchema
>;
export type CatalogCategoryListQuery = z.infer<
  typeof CatalogCategoryListQuerySchema
>;
export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
export type CatalogProductCreateInput = z.infer<
  typeof CatalogProductCreateSchema
>;
export type CatalogProductUpdateInput = z.infer<
  typeof CatalogProductUpdateSchema
>;
export type CatalogProductListQuery = z.infer<typeof CatalogProductListQuerySchema>;
export type CatalogVariant = z.infer<typeof CatalogVariantSchema>;
