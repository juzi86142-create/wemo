import { z } from "zod";

import { DateRangeSchema, JsonValueSchema, RequestIdSchema } from "../common/index.js";

export const ReportKindSchema = z.enum([
  "dashboard",
  "sales",
  "product",
  "dealer",
  "content",
  "search",
  "lead",
]);

export const ReportMetricSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1).optional(),
  payload: JsonValueSchema.nullable().optional(),
});

export const ReportSeriesPointSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  payload: JsonValueSchema.nullable().optional(),
});

export const ReportSnapshotSchema = z.object({
  request_id: RequestIdSchema,
  kind: ReportKindSchema,
  generated_at: z.string().datetime(),
  period: DateRangeSchema.optional(),
  metrics: z.array(ReportMetricSchema),
  series: z.array(ReportSeriesPointSchema).default([]),
});

export const ReportQuerySchema = z.object({
  kind: ReportKindSchema,
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const ReportExportResponseSchema = z.object({
  request_id: RequestIdSchema,
  kind: ReportKindSchema,
  generated_at: z.string().datetime(),
  filename: z.string().min(1),
  content_type: z.literal("text/csv"),
  csv: z.string().min(1),
});

export type ReportKind = z.infer<typeof ReportKindSchema>;
export type ReportSnapshot = z.infer<typeof ReportSnapshotSchema>;
export type ReportExportResponse = z.infer<typeof ReportExportResponseSchema>;
