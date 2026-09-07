import { z } from "zod";

import {
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  RequestIdSchema,
} from "../common/index.js";

export const AuditLogSchema = z.object({
  id: EntityIdSchema,
  actor_id: EntityIdSchema,
  action: z.string().min(1),
  entity: z.string().min(1),
  entity_id: EntityIdSchema,
  before: JsonValueSchema.nullable(),
  after: JsonValueSchema.nullable(),
  ip: z.string().min(1).nullable(),
  request_id: RequestIdSchema,
  created_at: z.string().datetime(),
});

export const AuditLogQuerySchema = z.object({
  entity: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  actor_id: EntityIdSchema.optional(),
  request_id: RequestIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const AuditLogListResponseSchema = createListResponseSchema(
  AuditLogSchema,
);

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
