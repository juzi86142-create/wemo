import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  PaginationSchema,
  RequestIdSchema,
} from "../common/index.js";
import { DealerContextSchema } from "../dealers/index.js";

export const AccountAudienceSchema = z.enum(["user", "dealer", "staff"]);
export const AccountStatusSchema = z.enum([
  "pending_verification",
  "active",
  "suspended",
  "closed",
]);

export const PermissionCodeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)+$/);

export const IdentitySubscriptionStatusSchema = z.enum([
  "active",
  "paused",
  "unsubscribed",
]);

export const IdentityNotificationStatusSchema = z.enum([
  "queued",
  "sent",
  "failed",
]);

export const IdentityDataRequestStatusSchema = z.enum([
  "requested",
  "processing",
  "completed",
  "rejected",
]);

export const SessionActorSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  audience: AccountAudienceSchema,
  company_id: z.coerce.number().int().positive().optional(),
  permissions: z.array(PermissionCodeSchema),
});

export const IdentityUserSchema = z
  .object({
    id: EntityIdSchema,
    email: z.string().trim().min(3).max(320),
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1).nullable(),
    locale: z.string().trim().min(2).max(40),
    audience: AccountAudienceSchema,
    status: AccountStatusSchema,
    verified_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict();

export const AuthSessionSchema = z
  .object({
    id: EntityIdSchema,
    token: z.string().min(1),
    user_id: EntityIdSchema,
    audience: AccountAudienceSchema,
    company_id: EntityIdSchema.nullable(),
    permissions: z.array(PermissionCodeSchema),
    expires_at: z.string().datetime(),
    revoked_at: z.string().datetime().nullable(),
    last_seen_at: z.string().datetime(),
    created_at: z.string().datetime(),
  })
  .strict();

export const IdentityAddressSchema = z
  .object({
    id: EntityIdSchema,
    user_id: EntityIdSchema,
    kind: z.string().trim().min(1),
    payload: JsonValueSchema,
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const IdentitySubscriptionSchema = z
  .object({
    id: EntityIdSchema,
    user_id: EntityIdSchema,
    channel: z.string().trim().min(1),
    status: IdentitySubscriptionStatusSchema,
    consent_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const IdentityDataRequestSchema = z
  .object({
    id: EntityIdSchema,
    user_id: EntityIdSchema,
    kind: z.string().trim().min(1),
    status: IdentityDataRequestStatusSchema,
    request_id: RequestIdSchema,
    notes: z.string().trim().min(1).nullable(),
    created_at: z.string().datetime(),
    completed_at: z.string().datetime().nullable(),
  })
  .strict()
  .passthrough();

export const IdentityNotificationSchema = z
  .object({
    id: EntityIdSchema,
    recipient_user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    audience: AccountAudienceSchema,
    kind: z.string().trim().min(1),
    channel: z.string().trim().min(1),
    template_key: z.string().trim().min(1),
    status: IdentityNotificationStatusSchema,
    request_id: RequestIdSchema,
    payload: JsonValueSchema,
    failure_reason: z.string().trim().min(1).nullable(),
    created_at: z.string().datetime(),
    sent_at: z.string().datetime().nullable(),
  })
  .strict()
  .passthrough();

export const IdentityRoleSchema = z
  .object({
    id: EntityIdSchema,
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    audience: AccountAudienceSchema,
    permissions: z.array(PermissionCodeSchema),
  })
  .strict()
  .passthrough();

export const AuthRegisterSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    name: z.string().trim().min(1).max(120),
    audience: AccountAudienceSchema,
    agree_terms: z.boolean(),
    agree_marketing: z.boolean(),
  })
  .strict();

export const AuthLoginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1),
    audience: AccountAudienceSchema.optional(),
  })
  .strict();

export const AuthVerifyEmailSchema = z
  .object({
    email: z.string().trim().email(),
  })
  .strict();

export const AuthForgotPasswordSchema = z
  .object({
    email: z.string().trim().email(),
  })
  .strict();

export const AuthSessionRevokeSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

export const AuthSessionListQuerySchema = PaginationSchema.extend({
  audience: AccountAudienceSchema.optional(),
  status: z.enum(["active", "revoked", "expired"]).optional(),
});

export const IdentityAddressCreateSchema = z
  .object({
    kind: z.string().trim().min(1),
    payload: JsonValueSchema,
  })
  .strict();

export const IdentitySubscriptionUpsertSchema = z
  .object({
    channel: z.string().trim().min(1),
    status: IdentitySubscriptionStatusSchema,
    consent_at: z.string().datetime().nullable().optional(),
  })
  .strict();

export const IdentityDataRequestCreateSchema = z
  .object({
    kind: z.string().trim().min(1),
    notes: z.string().trim().min(1).optional(),
  })
  .strict();

export const IdentityNotificationListQuerySchema = PaginationSchema.extend({
  recipient_user_id: EntityIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
  audience: AccountAudienceSchema.optional(),
  status: IdentityNotificationStatusSchema.optional(),
});

export const IdentityPermissionUpdateSchema = z
  .object({
    permissions: z.array(PermissionCodeSchema),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const IdentityProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    locale: z.string().trim().min(2).max(40).optional(),
  })
  .strict();

export const IdentityProfileSchema = z
  .object({
    user: IdentityUserSchema,
    permissions: z.array(PermissionCodeSchema),
    addresses: z.array(IdentityAddressSchema),
    subscriptions: z.array(IdentitySubscriptionSchema),
    dealer_context: DealerContextSchema.nullable(),
  })
  .strict()
  .passthrough();

export const IdentityRoleListResponseSchema =
  createListResponseSchema(IdentityRoleSchema);
export const IdentityRoleMutationResponseSchema =
  createItemResponseSchema(IdentityRoleSchema);

export const IdentityUserMutationResponseSchema =
  createItemResponseSchema(IdentityUserSchema);
export const AuthSessionMutationResponseSchema =
  createItemResponseSchema(AuthSessionSchema);
export const AuthSessionListResponseSchema =
  createListResponseSchema(AuthSessionSchema);

export const IdentityAddressListResponseSchema =
  createListResponseSchema(IdentityAddressSchema);
export const IdentityAddressMutationResponseSchema =
  createItemResponseSchema(IdentityAddressSchema);

export const IdentitySubscriptionListResponseSchema =
  createListResponseSchema(IdentitySubscriptionSchema);
export const IdentitySubscriptionMutationResponseSchema =
  createItemResponseSchema(IdentitySubscriptionSchema);

export const IdentityDataRequestListResponseSchema =
  createListResponseSchema(IdentityDataRequestSchema);
export const IdentityDataRequestMutationResponseSchema =
  createItemResponseSchema(IdentityDataRequestSchema);

export const IdentityNotificationListResponseSchema =
  createListResponseSchema(IdentityNotificationSchema);
export const IdentityNotificationMutationResponseSchema =
  createItemResponseSchema(IdentityNotificationSchema);

export const IdentityProfileResponseSchema =
  createItemResponseSchema(IdentityProfileSchema);

export type AccountAudience = z.infer<typeof AccountAudienceSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type PermissionCode = z.infer<typeof PermissionCodeSchema>;
export type IdentitySubscriptionStatus = z.infer<
  typeof IdentitySubscriptionStatusSchema
>;
export type IdentityNotificationStatus = z.infer<
  typeof IdentityNotificationStatusSchema
>;
export type IdentityDataRequestStatus = z.infer<
  typeof IdentityDataRequestStatusSchema
>;
export type SessionActor = z.infer<typeof SessionActorSchema>;
export type IdentityUser = z.infer<typeof IdentityUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type IdentityAddress = z.infer<typeof IdentityAddressSchema>;
export type IdentitySubscription = z.infer<typeof IdentitySubscriptionSchema>;
export type IdentityDataRequest = z.infer<typeof IdentityDataRequestSchema>;
export type IdentityNotification = z.infer<typeof IdentityNotificationSchema>;
export type IdentityRole = z.infer<typeof IdentityRoleSchema>;
export type IdentityProfileUpdate = z.infer<typeof IdentityProfileUpdateSchema>;
export type AuthRegisterInput = z.infer<typeof AuthRegisterSchema>;
export type AuthLoginInput = z.infer<typeof AuthLoginSchema>;
export type AuthVerifyEmailInput = z.infer<typeof AuthVerifyEmailSchema>;
export type AuthForgotPasswordInput = z.infer<typeof AuthForgotPasswordSchema>;
export type AuthSessionRevokeInput = z.infer<typeof AuthSessionRevokeSchema>;
export type AuthSessionListQuery = z.infer<typeof AuthSessionListQuerySchema>;
export type IdentityAddressCreateInput = z.infer<
  typeof IdentityAddressCreateSchema
>;
export type IdentitySubscriptionUpsertInput = z.infer<
  typeof IdentitySubscriptionUpsertSchema
>;
export type IdentityDataRequestCreateInput = z.infer<
  typeof IdentityDataRequestCreateSchema
>;
export type IdentityNotificationListQuery = z.infer<
  typeof IdentityNotificationListQuerySchema
>;
export type IdentityPermissionUpdateInput = z.infer<
  typeof IdentityPermissionUpdateSchema
>;
export type IdentitySubscriptionListResponse = z.infer<
  typeof IdentitySubscriptionListResponseSchema
>;
export type IdentityProfile = z.infer<typeof IdentityProfileSchema>;
