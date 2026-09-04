import { z } from "zod";

export const DealerApplicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

export const DealerCompanyStatusSchema = z.enum([
  "active",
  "suspended",
  "closed",
]);

export const DealerContextSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  display_name: z.string(),
  status: DealerCompanyStatusSchema,
  currency: z.string().length(3),
  permissions: z.array(z.string()),
});

export type DealerContext = z.infer<typeof DealerContextSchema>;
