import { z } from "zod";

export const EntityIdSchema = z.coerce.number().int().positive();

export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field_errors: z.array(FieldErrorSchema).default([]),
  request_id: z.string(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
