import { z } from "zod";

export const ContentStatusSchema = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const TranslationStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "ready",
  "published",
]);

export const SeoMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  canonical_url: z.url().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image_url: z.url().optional(),
  indexable: z.boolean(),
});

export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
