import { z } from "zod";

import {
  createPaginatedResponseSchema,
  EntityIdSchema,
  RequestIdSchema,
} from "../common/index.js";

export const LanguageCodeSchema = z.string().regex(/^[a-z]{2,3}$/);
export const LocaleCodeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/);
export const MarketCodeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,7}$/);
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const TimeZoneSchema = z.string().trim().min(1).max(64);
export const LocalePathPrefixSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const PlatformRecordStatusSchema = z.enum(["active", "inactive"]);
export const TranslationFallbackPolicySchema = z.enum([
  "default_locale",
  "hide_untranslated",
]);
export const MarketSettingsSchema = z
  .object({ fallback_policy: TranslationFallbackPolicySchema })
  .strict();

type MarketLocaleIdentity = {
  locale: string;
  path_prefix: string;
  is_default: boolean;
};

function validateMarketLocales(
  locales: MarketLocaleIdentity[],
  context: Pick<z.core.$RefinementCtx, "addIssue">,
) {
  if (locales.filter((locale) => locale.is_default).length !== 1) {
    context.addIssue({
      code: "custom",
      message: "必须且只能配置一个默认 locale",
      path: ["locales"],
    });
  }

  for (const key of ["locale", "path_prefix"] as const) {
    const values = locales.map((locale) => locale[key]);
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: `${key} 不得重复`,
        path: ["locales"],
      });
    }
  }
}

export const LanguageSchema = z
  .object({
    id: EntityIdSchema,
    code: LanguageCodeSchema,
    label: z.string().trim().min(1).max(80),
    native_label: z.string().trim().min(1).max(80),
    status: PlatformRecordStatusSchema,
  })
  .strict();

export const MarketLocaleSchema = z
  .object({
    locale: LocaleCodeSchema,
    language: LanguageSchema,
    path_prefix: LocalePathPrefixSchema,
    is_default: z.boolean(),
    sort_order: z.number().int(),
  })
  .strict();

export const MarketSchema = z
  .object({
    id: EntityIdSchema,
    code: MarketCodeSchema,
    currency: CurrencyCodeSchema,
    timezone: TimeZoneSchema,
    fallback_policy: TranslationFallbackPolicySchema,
    locales: z.array(MarketLocaleSchema).min(1),
    status: PlatformRecordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateMarketLocales(value.locales, context);
  });

export const MarketListResponseSchema =
  createPaginatedResponseSchema(MarketSchema);
export const LanguageListResponseSchema =
  createPaginatedResponseSchema(LanguageSchema);

export const ResolveMarketContextQuerySchema = z
  .object({
    market: MarketCodeSchema,
    locale: LocaleCodeSchema,
  })
  .strict();

export const MarketContextSchema = z
  .object({
    market: MarketCodeSchema,
    requested_locale: LocaleCodeSchema,
    resolved_locale: LocaleCodeSchema,
    currency: CurrencyCodeSchema,
    timezone: TimeZoneSchema,
    path_prefix: LocalePathPrefixSchema,
    fallback_policy: TranslationFallbackPolicySchema,
    used_fallback: z.boolean(),
  })
  .strict();

export const UpsertLanguageSchema = LanguageSchema.omit({ id: true }).strict();

const MarketLocaleInputSchema = z
  .object({
    locale: LocaleCodeSchema,
    language_code: LanguageCodeSchema,
    path_prefix: LocalePathPrefixSchema,
    is_default: z.boolean(),
    sort_order: z.number().int().default(0),
  })
  .strict();

export const SaveMarketSchema = z
  .object({
    code: MarketCodeSchema,
    currency: CurrencyCodeSchema,
    timezone: TimeZoneSchema,
    fallback_policy: TranslationFallbackPolicySchema,
    locales: z.array(MarketLocaleInputSchema).min(1),
    status: PlatformRecordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateMarketLocales(value.locales, context);
  });

export const FeatureFlagsSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.boolean(),
);

export const PublicPlatformConfigSchema = z
  .object({
    version: z.string().trim().min(1),
    markets: z.array(MarketSchema),
    feature_flags: FeatureFlagsSchema,
    generated_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const AnalyticsEventNameSchema = z.enum([
  "view_home",
  "view_product_list",
  "view_product",
  "search",
  "select_filter",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "dealer_apply_start",
  "dealer_apply_submit",
  "request_quote",
  "download_asset",
  "contact_submit",
  "newsletter_subscribe",
]);

export const AnalyticsContextSchema = z
  .object({
    market: MarketCodeSchema,
    language: LanguageCodeSchema,
    device: z.enum(["desktop", "tablet", "mobile", "other"]),
    role: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

const AnalyticsItemSchema = z
  .object({
    sku: z.string().trim().min(1).max(100),
    qty: z.number().int().positive(),
  })
  .strict();

function analyticsEvent<EventName extends string, Properties extends z.ZodType>(
  name: EventName,
  properties: Properties,
) {
  return z
    .object({
      event_id: z.string().trim().min(1).max(128),
      request_id: RequestIdSchema,
      name: z.literal(name),
      occurred_at: z.string().datetime({ offset: true }),
      context: AnalyticsContextSchema,
      properties,
    })
    .strict();
}

export const AnalyticsEventSchema = z.discriminatedUnion("name", [
  analyticsEvent("view_home", z.object({}).strict()),
  analyticsEvent(
    "view_product_list",
    z
      .object({
        category: z.string().trim().min(1),
        filters: z.record(z.string(), z.array(z.string())),
        sort: z.string().trim().min(1),
      })
      .strict(),
  ),
  analyticsEvent(
    "view_product",
    z
      .object({
        product_id: EntityIdSchema,
        sku: z.string().trim().min(1).max(100).optional(),
        role: z.string().trim().min(1).max(40),
      })
      .strict(),
  ),
  analyticsEvent(
    "search",
    z
      .object({
        query: z.string().trim().min(1).max(200),
        results_count: z.number().int().nonnegative(),
      })
      .strict(),
  ),
  analyticsEvent(
    "select_filter",
    z
      .object({
        filter_name: z.string().trim().min(1),
        value: z.string().trim().min(1),
      })
      .strict(),
  ),
  analyticsEvent(
    "add_to_cart",
    z
      .object({
        sku: z.string().trim().min(1).max(100),
        qty: z.number().int().positive(),
        price_type: z.string().trim().min(1).max(40),
      })
      .strict(),
  ),
  analyticsEvent(
    "begin_checkout",
    z
      .object({
        cart_value: z.number().int().nonnegative(),
        role: z.string().trim().min(1).max(40),
      })
      .strict(),
  ),
  analyticsEvent(
    "purchase",
    z
      .object({
        order_id: EntityIdSchema,
        revenue: z.number().int().nonnegative(),
        channel: z.enum(["b2c", "b2b"]),
      })
      .strict(),
  ),
  analyticsEvent(
    "dealer_apply_start",
    z.object({ country: z.string().trim().min(2).max(80) }).strict(),
  ),
  analyticsEvent(
    "dealer_apply_submit",
    z.object({ application_id: EntityIdSchema }).strict(),
  ),
  analyticsEvent(
    "request_quote",
    z
      .object({
        company_id: EntityIdSchema,
        items: z.array(AnalyticsItemSchema).min(1),
      })
      .strict(),
  ),
  analyticsEvent(
    "download_asset",
    z
      .object({
        asset_id: EntityIdSchema,
        visibility: z.enum(["public", "registered", "dealer", "internal"]),
      })
      .strict(),
  ),
  analyticsEvent(
    "contact_submit",
    z.object({ form_type: z.string().trim().min(1).max(80) }).strict(),
  ),
  analyticsEvent(
    "newsletter_subscribe",
    z.object({ source: z.string().trim().min(1).max(100) }).strict(),
  ),
]);

export type Language = z.infer<typeof LanguageSchema>;
export type Market = z.infer<typeof MarketSchema>;
export type MarketContext = z.infer<typeof MarketContextSchema>;
export type SaveMarketInput = z.infer<typeof SaveMarketSchema>;
export type UpsertLanguageInput = z.infer<typeof UpsertLanguageSchema>;
export type PublicPlatformConfig = z.infer<typeof PublicPlatformConfigSchema>;
export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

export { RequestContextSchema } from "./runtime.js";
export type {
  MarketContext as RuntimeMarketContext,
  RequestActor,
  RequestContext,
  RequestPayload,
} from "./runtime.js";
export {
  AnalyticsEventBatchSchema,
  AnalyticsEventIngestResponseSchema,
  AnalyticsEventInputSchema,
  AnalyticsEventListQuerySchema,
  AnalyticsEventListResponseSchema,
  AnalyticsEventRecordSchema,
} from "./analytics.js";
export type {
  AnalyticsEventInput,
  AnalyticsEventRecord,
} from "./analytics.js";
export {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
  AuditLogSchema,
} from "./audit.js";
export type { AuditLog, AuditLogQuery } from "./audit.js";
export {
  IntegrationAdapterSchema,
  IntegrationListResponseSchema,
  IntegrationMutationResponseSchema,
  IntegrationKindSchema,
  IntegrationStatusSchema,
  WebhookDeliveryListQuerySchema,
  WebhookDeliveryListResponseSchema,
  WebhookDeliveryMutationResponseSchema,
  WebhookDeliverySchema,
  WebhookDeliveryStatusSchema,
  WebhookIngestSchema,
} from "./integrations.js";
export type {
  IntegrationAdapter,
  IntegrationKind,
  IntegrationStatus,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookIngest,
} from "./integrations.js";
export {
  JobCreateSchema,
  JobListQuerySchema,
  JobListResponseSchema,
  JobMutationResponseSchema,
  JobRetrySchema,
  JobRunSchema,
  JobKindSchema,
  JobStatusSchema,
} from "./jobs.js";
export type { JobKind, JobRun, JobStatus } from "./jobs.js";
export {
  OutboxEventListResponseSchema,
  OutboxEventQuerySchema,
  OutboxEventSchema,
  OutboxStatusSchema,
} from "./outbox.js";
export type { OutboxEvent, OutboxStatus } from "./outbox.js";
export {
  ReportExportResponseSchema,
  ReportKindSchema,
  ReportMetricSchema,
  ReportQuerySchema,
  ReportSeriesPointSchema,
  ReportSnapshotSchema,
} from "./reports.js";
export type { ReportExportResponse, ReportKind, ReportSnapshot } from "./reports.js";
export {
  PlatformSettingListResponseSchema,
  PlatformSettingMutationResponseSchema,
  PlatformSettingMutationSchema,
  PlatformSettingSchema,
  PlatformSettingGroupSchema,
  PlatformSettingsSnapshotSchema,
  PlatformSettingUpdateSchema,
} from "./settings.js";
export type {
  PlatformSetting,
  PlatformSettingGroup,
  PlatformSettingsSnapshot,
  PlatformSettingUpdate,
  PlatformSettingMutation,
} from "./settings.js";
