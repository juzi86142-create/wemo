import { z } from "zod";

import {
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

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

export const AnalyticsEventInputSchema = z.object({
  name: AnalyticsEventNameSchema,
  payload: JsonValueSchema.default({}),
  market: z.string().min(2).optional(),
  locale: z.string().min(2).optional(),
  device: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  dedupe_key: z.string().min(1).optional(),
});

export const AnalyticsEventBatchSchema = z.object({
  events: z.array(AnalyticsEventInputSchema).min(1).max(50),
});

export const AnalyticsEventRecordSchema = z.object({
  id: EntityIdSchema,
  name: AnalyticsEventNameSchema,
  request_id: RequestIdSchema,
  user_id: EntityIdSchema.nullable(),
  company_id: EntityIdSchema.nullable(),
  market: z.string().min(2).nullable(),
  locale: z.string().min(2).nullable(),
  device: z.string().min(1).nullable(),
  role: z.string().min(1).nullable(),
  payload: JsonValueSchema,
  dedupe_key: z.string().min(1).nullable(),
  occurred_at: z.string().datetime(),
});

export const AnalyticsEventListResponseSchema = createListResponseSchema(
  AnalyticsEventRecordSchema,
);
export const AnalyticsEventListQuerySchema = z.object({
  name: AnalyticsEventNameSchema.optional(),
  request_id: RequestIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
  market: z.string().min(2).optional(),
  locale: z.string().min(2).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});
export const AnalyticsEventIngestResponseSchema = z.object({
  request_id: RequestIdSchema,
  accepted: z.coerce.number().int().min(0),
  deduplicated: z.coerce.number().int().min(0),
  items: z.array(AnalyticsEventRecordSchema),
});

export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;
export type AnalyticsEventInput = z.infer<typeof AnalyticsEventInputSchema>;
export type AnalyticsEventRecord = z.infer<typeof AnalyticsEventRecordSchema>;
