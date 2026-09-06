import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

export const IntegrationKindSchema = z.enum([
  "payment",
  "mail",
  "storage",
  "search",
  "erp",
  "tax",
  "logistics",
  "crm",
  "analytics",
  "webhook",
]);

export const IntegrationStatusSchema = z.enum([
  "healthy",
  "degraded",
  "disabled",
  "error",
]);

export const IntegrationAdapterSchema = z.object({
  id: EntityIdSchema,
  code: z.string().min(1),
  kind: IntegrationKindSchema,
  provider: z.string().min(1),
  status: IntegrationStatusSchema,
  last_checked_at: z.string().datetime().nullable(),
  last_error: z.string().min(1).nullable(),
  capabilities: z.array(z.string().min(1)).default([]),
  metadata: JsonValueSchema,
});

export const WebhookDeliveryStatusSchema = z.enum([
  "received",
  "verified",
  "accepted",
  "queued",
  "processing",
  "succeeded",
  "failed",
  "rejected",
  "duplicate",
]);

export const WebhookDeliverySchema = z.object({
  id: EntityIdSchema,
  integration_id: EntityIdSchema,
  provider: z.string().min(1),
  event: z.string().min(1),
  status: WebhookDeliveryStatusSchema,
  idempotency_key: z.string().min(1).nullable(),
  request_id: RequestIdSchema,
  attempt_count: z.coerce.number().int().min(0),
  failure_reason: z.string().min(1).nullable(),
  payload: JsonValueSchema,
  response: JsonValueSchema.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});

export const WebhookIngestSchema = z.object({
  event: z.string().min(1),
  idempotency_key: z.string().min(1),
  payload: JsonValueSchema,
  signature_version: z.string().min(1).optional(),
});

export const IntegrationListResponseSchema = createListResponseSchema(
  IntegrationAdapterSchema,
);
export const IntegrationMutationResponseSchema = createItemResponseSchema(
  IntegrationAdapterSchema,
);

export const WebhookDeliveryListResponseSchema = createListResponseSchema(
  WebhookDeliverySchema,
);
export const WebhookDeliveryListQuerySchema = z.object({
  provider: z.string().min(1).optional(),
  status: WebhookDeliveryStatusSchema.optional(),
  request_id: RequestIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});
export const WebhookDeliveryMutationResponseSchema = createItemResponseSchema(
  WebhookDeliverySchema,
);

export type IntegrationKind = z.infer<typeof IntegrationKindSchema>;
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;
export type IntegrationAdapter = z.infer<typeof IntegrationAdapterSchema>;
export type WebhookDeliveryStatus = z.infer<
  typeof WebhookDeliveryStatusSchema
>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
export type WebhookIngest = z.infer<typeof WebhookIngestSchema>;
