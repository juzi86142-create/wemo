import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  PaginationSchema,
  RequestIdSchema,
} from "../common/index.js";
import { AccountAudienceSchema } from "../identity/index.js";

export const ContentStatusSchema = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const TranslationStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "ready",
  "published",
]);

export const SeoMetadataSchema = z
  .object({
    title: z.string().min(1),
    description: z.string(),
    canonical_url: z.url().optional(),
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    og_image_url: z.url().optional(),
    indexable: z.boolean(),
  })
  .strict();

export const LocalizationMarketSchema = z
  .object({
    code: z.string().min(1),
    default_locale: z.string().min(1),
    currency: z.string().length(3),
    timezone: z.string().min(1),
    fallback_locales: z.array(z.string().min(1)),
    status: z.string().min(1),
  })
  .strict();

export const LocalizationLocaleSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    market: z.string().min(1),
    direction: z.string().min(1),
    fallback_locale: z.string().min(1).nullable(),
    status: z.string().min(1),
  })
  .strict();

export const LocalizationRouteSchema = z
  .object({
    market: z.string().min(1),
    locale: z.string().min(1),
    prefix: z.string().min(1),
    default: z.boolean(),
    fallback_chain: z.array(z.string().min(1)),
  })
  .strict();

export const LocalizationSnapshotSchema = createItemResponseSchema(
  z
    .object({
      markets: z.array(LocalizationMarketSchema),
      locales: z.array(LocalizationLocaleSchema),
      routes: z.array(LocalizationRouteSchema),
    })
    .strict(),
);

export const ContentEntrySchema = z
  .object({
    id: EntityIdSchema,
    type: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    body: JsonValueSchema,
    seo: SeoMetadataSchema,
    status: ContentStatusSchema,
    locale: z.string().min(1),
    market: z.string().min(1),
    translation_status: TranslationStatusSchema,
    linked_product_ids: z.array(EntityIdSchema),
    media_asset_ids: z.array(EntityIdSchema),
    published_at: z.string().datetime().nullable(),
    archived_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const ContentEntryCreateSchema = z
  .object({
    type: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    body: JsonValueSchema.default({}),
    seo: SeoMetadataSchema,
    status: ContentStatusSchema.optional(),
    locale: z.string().min(1),
    market: z.string().min(1),
    translation_status: TranslationStatusSchema.optional(),
    linked_product_ids: z.array(EntityIdSchema).optional(),
    media_asset_ids: z.array(EntityIdSchema).optional(),
  })
  .strict();

export const ContentEntryUpdateSchema = z
  .object({
    type: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    body: JsonValueSchema.optional(),
    seo: SeoMetadataSchema.optional(),
    status: ContentStatusSchema.optional(),
    locale: z.string().min(1).optional(),
    market: z.string().min(1).optional(),
    translation_status: TranslationStatusSchema.optional(),
    linked_product_ids: z.array(EntityIdSchema).optional(),
    media_asset_ids: z.array(EntityIdSchema).optional(),
  })
  .strict();

export const ContentEntryListQuerySchema = PaginationSchema.extend({
  type: z.string().min(1).optional(),
  status: ContentStatusSchema.optional(),
  locale: z.string().min(1).optional(),
  market: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
});

const ContentNavigationItemSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      id: EntityIdSchema,
      label: z.string().min(1),
      path: z.string().min(1),
      order: z.number().int(),
      children: z.array(ContentNavigationItemSchema).default([]),
    })
    .strict()
    .passthrough(),
);

export const ContentNavigationSchema = z
  .object({
    id: EntityIdSchema,
    slug: z.string().min(1),
    market: z.string().min(1),
    locale: z.string().min(1),
    status: ContentStatusSchema,
    items: z.array(ContentNavigationItemSchema),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const ContentEntryListResponseSchema =
  createListResponseSchema(ContentEntrySchema);
export const ContentEntryMutationResponseSchema =
  createItemResponseSchema(ContentEntrySchema);
export const ContentNavigationListResponseSchema =
  createListResponseSchema(ContentNavigationSchema);

export const MediaVisibilitySchema = z.enum([
  "public",
  "registered",
  "dealer",
  "internal",
]);

const MediaVersionSchema = z
  .object({
    version: z.string().min(1),
    file_key: z.string().min(1),
    mime: z.string().min(1),
    size: z.number().int().nonnegative(),
    checksum: z.string().min(1),
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const MediaAssetSchema = z
  .object({
    id: EntityIdSchema,
    type: z.string().min(1),
    file_key: z.string().min(1),
    mime: z.string().min(1),
    size: z.number().int().nonnegative(),
    checksum: z.string().min(1),
    alt: z.string().min(1).nullable(),
    visibility: MediaVisibilitySchema,
    tags: z.array(z.string().min(1)),
    versions: z.array(MediaVersionSchema),
    metadata: JsonValueSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const MediaAssetCreateSchema = z
  .object({
    type: z.string().min(1),
    file_key: z.string().min(1),
    mime: z.string().min(1),
    size: z.number().int().nonnegative(),
    checksum: z.string().min(1),
    alt: z.string().min(1).nullable().optional(),
    visibility: MediaVisibilitySchema,
    tags: z.array(z.string().min(1)),
    metadata: JsonValueSchema.optional(),
  })
  .strict();

export const MediaAssetListQuerySchema = PaginationSchema.extend({
  visibility: MediaVisibilitySchema.optional(),
  type: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
});

export const MediaAssetListResponseSchema =
  createListResponseSchema(MediaAssetSchema);
export const MediaAssetMutationResponseSchema =
  createItemResponseSchema(MediaAssetSchema);

export const MediaSignedUrlResponseSchema = createItemResponseSchema(
  z
    .object({
      asset_id: EntityIdSchema,
      url: z.string().url(),
      expires_at: z.string().datetime(),
      method: z.literal("GET"),
    })
    .strict(),
);

const FormSubmissionHistorySchema = z
  .object({
    status: z.string().min(1),
    note: z.string().min(1).nullable(),
    actor_id: EntityIdSchema.nullable(),
    request_id: RequestIdSchema,
    created_at: z.string().datetime(),
  })
  .strict();

export const FormSubmissionSchema = z
  .object({
    id: EntityIdSchema,
    submission_no: z.string().min(1),
    type: z.string().min(1),
    source: z.string().min(1),
    payload: JsonValueSchema,
    attachments: z.array(EntityIdSchema),
    assignee_id: EntityIdSchema.nullable(),
    priority: z.string().min(1),
    tags: z.array(z.string().min(1)),
    internal_note: z.string().min(1).nullable(),
    status: z.string().min(1),
    request_id: RequestIdSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    history: z.array(FormSubmissionHistorySchema),
  })
  .strict()
  .passthrough();

export const FormSubmissionCreateSchema = z
  .object({
    type: z.string().min(1),
    source: z.string().min(1),
    payload: JsonValueSchema,
    attachments: z.array(EntityIdSchema).default([]),
    priority: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const FormSubmissionListQuerySchema = PaginationSchema.extend({
  type: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  assignee_id: EntityIdSchema.optional(),
});

export const FormSubmissionUpdateSchema = z
  .object({
    assignee_id: EntityIdSchema.nullable().optional(),
    priority: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    internal_note: z.string().min(1).nullable().optional(),
    status: z.string().min(1).optional(),
  })
  .strict();

export const FormSubmissionListResponseSchema =
  createListResponseSchema(FormSubmissionSchema);
export const FormSubmissionMutationResponseSchema =
  createItemResponseSchema(FormSubmissionSchema);

export const NotificationTemplateSchema = z
  .object({
    id: EntityIdSchema,
    code: z.string().min(1),
    audience: AccountAudienceSchema,
    channel: z.string().min(1),
    locale: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    variables: z.array(z.string().min(1)),
    category: z.string().min(1),
    active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const NotificationTemplateCreateSchema = z
  .object({
    code: z.string().min(1),
    audience: AccountAudienceSchema,
    channel: z.string().min(1),
    locale: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    variables: z.array(z.string().min(1)),
    category: z.string().min(1),
    active: z.boolean(),
  })
  .strict();

export const NotificationTemplateUpdateSchema = z
  .object({
    code: z.string().min(1).optional(),
    audience: AccountAudienceSchema.optional(),
    channel: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    variables: z.array(z.string().min(1)).optional(),
    category: z.string().min(1).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const NotificationDeliverySchema = z
  .object({
    id: EntityIdSchema,
    template_code: z.string().min(1),
    recipient_user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    audience: AccountAudienceSchema,
    channel: z.string().min(1),
    status: z.string().min(1),
    request_id: RequestIdSchema,
    payload: JsonValueSchema,
    attempts: z.number().int().nonnegative(),
    provider_message_id: z.string().min(1).nullable(),
    failure_reason: z.string().min(1).nullable(),
    created_at: z.string().datetime(),
    sent_at: z.string().datetime().nullable(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const NotificationDeliveryCreateSchema = z
  .object({
    template_code: z.string().min(1),
    recipient_user_id: EntityIdSchema.nullable().optional(),
    company_id: EntityIdSchema.nullable().optional(),
    audience: AccountAudienceSchema,
    channel: z.string().min(1),
    status: z.string().min(1).optional(),
    request_id: RequestIdSchema.optional(),
    payload: JsonValueSchema,
    provider_message_id: z.string().min(1).nullable().optional(),
    failure_reason: z.string().min(1).nullable().optional(),
  })
  .strict();

export const NotificationDeliveryRetrySchema = z
  .object({
    reason: z.string().min(1).optional(),
  })
  .strict();

export const NotificationDeliveryListQuerySchema = PaginationSchema.extend({
  recipient_user_id: EntityIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
  audience: AccountAudienceSchema.optional(),
  status: z.string().min(1).optional(),
  request_id: RequestIdSchema.optional(),
});

export const NotificationTemplateListResponseSchema =
  createListResponseSchema(NotificationTemplateSchema);
export const NotificationTemplateMutationResponseSchema =
  createItemResponseSchema(NotificationTemplateSchema);
export const NotificationDeliveryListResponseSchema =
  createListResponseSchema(NotificationDeliverySchema);
export const NotificationDeliveryMutationResponseSchema =
  createItemResponseSchema(NotificationDeliverySchema);

export const SearchHitSchema = z
  .object({
    entity_type: z.string().min(1),
    entity_id: EntityIdSchema,
    slug: z.string().min(1),
    title: z.string().min(1),
    snippet: z.string(),
    url: z.string().min(1),
    market: z.string().min(1),
    locale: z.string().min(1),
    status: z.string().min(1),
    score: z.number(),
    primary_image_url: z.string().url().nullable(),
  })
  .strict()
  .passthrough();

export const SearchQuerySchema = z
  .object({
    q: z.string().min(1),
    type: z.string().min(1).optional(),
    market: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const SearchResponseSchema = createListResponseSchema(SearchHitSchema);
export const SearchSuggestionResponseSchema = z
  .object({
    q: z.string().min(1),
    suggestions: z.array(z.string().min(1)),
  })
  .strict();

export const SeoRedirectSchema = z
  .object({
    id: EntityIdSchema,
    source_path: z.string().min(1),
    target_path: z.string().min(1),
    status_code: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const SeoRedirectCreateSchema = z
  .object({
    source_path: z.string().min(1),
    target_path: z.string().min(1),
    status_code: z.number().int().optional(),
  })
  .strict();

export const SeoRedirectListResponseSchema =
  createListResponseSchema(SeoRedirectSchema);
export const SeoRedirectMutationResponseSchema =
  createItemResponseSchema(SeoRedirectSchema);

export const SeoSitemapEntrySchema = z
  .object({
    url: z.string().url(),
    lastmod: z.string().datetime(),
    locale: z.string().min(1),
    market: z.string().min(1),
    changefreq: z.enum(["weekly", "monthly"]),
    priority: z.number(),
  })
  .strict()
  .passthrough();

export const SeoSitemapSchema = z
  .object({
    generated_at: z.string().datetime(),
    entries: z.array(SeoSitemapEntrySchema),
  })
  .strict();

export const SeoSitemapResponseSchema = createItemResponseSchema(
  SeoSitemapSchema,
);

export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export type TranslationStatus = z.infer<typeof TranslationStatusSchema>;
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type LocalizationMarket = z.infer<typeof LocalizationMarketSchema>;
export type LocalizationLocale = z.infer<typeof LocalizationLocaleSchema>;
export type LocalizationRoute = z.infer<typeof LocalizationRouteSchema>;
export type LocalizationSnapshot = z.infer<typeof LocalizationSnapshotSchema>;
export type ContentEntry = z.infer<typeof ContentEntrySchema>;
export type ContentEntryCreateInput = z.infer<typeof ContentEntryCreateSchema>;
export type ContentEntryUpdateInput = z.infer<typeof ContentEntryUpdateSchema>;
export type ContentEntryListQuery = z.infer<typeof ContentEntryListQuerySchema>;
export type ContentNavigation = z.infer<typeof ContentNavigationSchema>;
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;
export type FormSubmissionCreateInput = z.infer<
  typeof FormSubmissionCreateSchema
>;
export type FormSubmissionListQuery = z.infer<
  typeof FormSubmissionListQuerySchema
>;
export type FormSubmissionUpdateInput = z.infer<
  typeof FormSubmissionUpdateSchema
>;
export type ContentEntryListResponse = z.infer<
  typeof ContentEntryListResponseSchema
>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type MediaAssetCreateInput = z.infer<typeof MediaAssetCreateSchema>;
export type MediaAssetListQuery = z.infer<typeof MediaAssetListQuerySchema>;
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
export type NotificationTemplateCreateInput = z.infer<
  typeof NotificationTemplateCreateSchema
>;
export type NotificationTemplateUpdateInput = z.infer<
  typeof NotificationTemplateUpdateSchema
>;
export type NotificationDelivery = z.infer<typeof NotificationDeliverySchema>;
export type NotificationDeliveryCreateInput = z.infer<
  typeof NotificationDeliveryCreateSchema
>;
export type NotificationDeliveryListQuery = z.infer<
  typeof NotificationDeliveryListQuerySchema
>;
export type SearchHit = z.infer<typeof SearchHitSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SeoRedirect = z.infer<typeof SeoRedirectSchema>;
export type SeoRedirectCreateInput = z.infer<typeof SeoRedirectCreateSchema>;
export type SeoSitemapEntry = z.infer<typeof SeoSitemapEntrySchema>;
