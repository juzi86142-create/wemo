import { z } from "zod";

export const EntityIdSchema = z.coerce.number().int().positive();
export const RequestIdSchema = z.string().trim().min(1).max(128);

export const FieldErrorSchema = z
  .object({
    field: z.string(),
    message: z.string(),
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    field_errors: z.array(FieldErrorSchema).default([]),
    request_id: RequestIdSchema,
  })
  .strict();

export const PaginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const PaginationMetaSchema = PaginationSchema.extend({
  total: z.number().int().nonnegative(),
}).strict();

export function createPaginatedResponseSchema<ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) {
  return z
    .object({
      items: z.array(itemSchema),
      page: z.number().int().positive(),
      page_size: z.number().int().positive().max(100),
      total: z.number().int().nonnegative(),
    })
    .strict();
}

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
