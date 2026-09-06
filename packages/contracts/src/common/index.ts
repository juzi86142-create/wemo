import { z } from "zod";

export const EntityIdSchema = z.coerce.number().int().positive();
export const RequestIdSchema = z.string().min(1);

export const FieldErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
});

export const ApiErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    field_errors: z.array(FieldErrorSchema).default([]),
    request_id: RequestIdSchema,
  })
  .strict();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginationMetaSchema = PaginationSchema.extend({
  total: z.number().int().nonnegative(),
});

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export function createListResponseSchema<ItemSchema extends z.ZodType>(
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

export function createItemResponseSchema<ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) {
  return z
    .object({
      request_id: RequestIdSchema,
      item: itemSchema,
    })
    .strict();
}

export function createPaginatedResponseSchema<ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) {
  return createListResponseSchema(itemSchema);
}

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type FieldError = z.infer<typeof FieldErrorSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
