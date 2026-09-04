import { z } from "zod";

export const ProductStatusSchema = z.enum([
  "draft",
  "scheduled",
  "active",
  "hidden",
  "archived",
]);

export const ProductSummarySchema = z.object({
  id: z.coerce.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  short_description: z.string(),
  age_min: z.number().int().nonnegative().nullable(),
  age_max: z.number().int().nonnegative().nullable(),
  tags: z.array(z.string()),
  primary_image_url: z.url().nullable(),
  status: ProductStatusSchema,
});

export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type ProductSummary = z.infer<typeof ProductSummarySchema>;
