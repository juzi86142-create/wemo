import { z } from "zod";

export const AccountAudienceSchema = z.enum(["user", "dealer", "staff"]);
export const AccountStatusSchema = z.enum([
  "pending_verification",
  "active",
  "suspended",
  "closed",
]);

export const SessionActorSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  audience: AccountAudienceSchema,
  company_id: z.coerce.number().int().positive().optional(),
  permissions: z.array(z.string()),
});

export type AccountAudience = z.infer<typeof AccountAudienceSchema>;
export type SessionActor = z.infer<typeof SessionActorSchema>;
