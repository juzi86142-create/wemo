import { z } from "zod";

import {
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

export const OutboxStatusSchema = z.enum([
  "pending",
  "processing",
  "processed",
  "failed",
  "dead_letter",
]);

export const OutboxEventSchema = z.object({
  id: EntityIdSchema,
  topic: z.string().min(1),
  aggregate_id: EntityIdSchema,
  payload: JsonValueSchema,
  status: OutboxStatusSchema,
  available_at: z.string().datetime(),
  processed_at: z.string().datetime().nullable(),
  request_id: RequestIdSchema,
  attempts: z.coerce.number().int().min(0).default(0),
  failure_reason: z.string().min(1).nullable().optional(),
  created_at: z.string().datetime(),
});

export const OutboxEventListResponseSchema = createListResponseSchema(
  OutboxEventSchema,
);

export const OutboxEventQuerySchema = z.object({
  status: OutboxStatusSchema.optional(),
  topic: z.string().min(1).optional(),
  request_id: RequestIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;
