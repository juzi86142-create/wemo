import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

export const JobKindSchema = z.enum([
  "email",
  "image",
  "index",
  "import_export",
  "webhook",
  "sync",
  "analysis",
  "report",
  "settings",
]);

export const JobStatusSchema = z.enum([
  "queued",
  "running",
  "retrying",
  "succeeded",
  "failed",
  "cancelled",
]);

export const JobAttemptSchema = z.object({
  attempt_no: z.coerce.number().int().min(1),
  status: JobStatusSchema,
  started_at: z.string().datetime().nullable(),
  finished_at: z.string().datetime().nullable(),
  failure_reason: z.string().min(1).nullable(),
  request_id: RequestIdSchema,
});

export const JobRunSchema = z.object({
  id: EntityIdSchema,
  kind: JobKindSchema,
  status: JobStatusSchema,
  idempotency_key: z.string().min(1),
  request_id: RequestIdSchema,
  actor_id: EntityIdSchema.nullable(),
  company_id: EntityIdSchema.nullable(),
  payload: JsonValueSchema,
  progress: z.coerce.number().int().min(0).max(100),
  attempts: z.coerce.number().int().min(0),
  max_attempts: z.coerce.number().int().min(1),
  failure_reason: z.string().min(1).nullable(),
  last_error: JsonValueSchema.nullable(),
  next_run_at: z.string().datetime().nullable(),
  started_at: z.string().datetime().nullable(),
  finished_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  attempts_history: z.array(JobAttemptSchema).default([]),
});

export const JobCreateSchema = z.object({
  kind: JobKindSchema,
  payload: JsonValueSchema,
  idempotency_key: z.string().min(1),
  max_attempts: z.coerce.number().int().min(1).max(10).default(3),
});

export const JobRetrySchema = z.object({
  reason: z.string().min(1).optional(),
});

export const JobListQuerySchema = z.object({
  kind: JobKindSchema.optional(),
  status: JobStatusSchema.optional(),
  request_id: RequestIdSchema.optional(),
  actor_id: EntityIdSchema.optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const JobListResponseSchema = createListResponseSchema(JobRunSchema);
export const JobMutationResponseSchema = createItemResponseSchema(JobRunSchema);

export type JobKind = z.infer<typeof JobKindSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobRun = z.infer<typeof JobRunSchema>;
