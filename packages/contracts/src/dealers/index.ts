import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  PaginationSchema,
} from "../common/index.js";

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

export const DealerMemberStatusSchema = z.enum([
  "active",
  "inactive",
  "invited",
]);

export const DealerContextSchema = z
  .object({
    company_id: EntityIdSchema,
    display_name: z.string().trim().min(1),
    status: DealerCompanyStatusSchema,
    currency: z.string().length(3),
    permissions: z.array(z.string().min(1)),
  })
  .strict();

export const DealerApplicationSchema = z
  .object({
    id: EntityIdSchema,
    application_no: z.string().min(1),
    applicant_user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    legal_name: z.string().min(1),
    display_name: z.string().min(1),
    country: z.string().min(1),
    website: z.string().url().nullable(),
    business_type: z.string().min(1),
    tax_id: z.string().min(1).nullable(),
    contact_name: z.string().min(1),
    contact_email: z.string().email(),
    contact_phone: z.string().min(1).nullable(),
    currency: z.string().length(3),
    payload: JsonValueSchema,
    status: DealerApplicationStatusSchema,
    submitted_at: z.string().datetime().nullable(),
    reviewed_at: z.string().datetime().nullable(),
    review_note: z.string().min(1).nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const DealerCompanySchema = z
  .object({
    id: EntityIdSchema,
    legal_name: z.string().min(1),
    display_name: z.string().min(1),
    country: z.string().min(1),
    website: z.string().url().nullable(),
    business_type: z.string().min(1),
    tax_id: z.string().min(1).nullable(),
    tier_id: EntityIdSchema.nullable(),
    price_list_id: EntityIdSchema.nullable(),
    currency: z.string().length(3),
    payment_terms: z.string().min(1),
    sales_territories: JsonValueSchema,
    authorized_categories: JsonValueSchema,
    sales_rep: z.string().min(1).nullable(),
    public_listing: z.boolean(),
    status: DealerCompanyStatusSchema,
    created_at: z.string().datetime(),
    archived_at: z.string().datetime().nullable(),
  })
  .strict()
  .passthrough();

export const DealerMemberSchema = z
  .object({
    id: EntityIdSchema,
    company_id: EntityIdSchema,
    user_id: EntityIdSchema,
    role: z.string().min(1),
    permissions: z.array(z.string().min(1)),
    status: DealerMemberStatusSchema,
    invited_at: z.string().datetime().nullable(),
    joined_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const DealerAddressSchema = z
  .object({
    id: EntityIdSchema,
    company_id: EntityIdSchema,
    kind: z.string().min(1),
    payload: JsonValueSchema,
    public_listing: JsonValueSchema.nullable(),
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const DealerPublicListingSchema = z
  .object({
    company: DealerCompanySchema,
    addresses: z.array(DealerAddressSchema),
  })
  .strict()
  .passthrough();

export const DealerApplicationCreateSchema = z
  .object({
    legal_name: z.string().min(1),
    display_name: z.string().min(1),
    country: z.string().min(1),
    website: z.string().url().optional().nullable(),
    business_type: z.string().min(1),
    tax_id: z.string().min(1).optional().nullable(),
    contact_name: z.string().min(1),
    contact_email: z.string().email(),
    contact_phone: z.string().min(1).optional().nullable(),
    currency: z.string().length(3),
    payload: JsonValueSchema.default({}),
  })
  .strict();

export const DealerApplicationSubmitSchema = z
  .object({
    note: z.string().min(1).optional(),
  })
  .strict();

export const DealerApplicationReviewSchema = z
  .object({
    decision: z.enum(["under_review", "approved", "rejected"]),
    reason: z.string().min(1).optional(),
    tier_id: EntityIdSchema.nullable().optional(),
    price_list_id: EntityIdSchema.nullable().optional(),
    payment_terms: z.string().min(1).optional(),
    sales_territories: JsonValueSchema.optional(),
    authorized_categories: JsonValueSchema.optional(),
    sales_rep: z.string().min(1).nullable().optional(),
    public_listing: z.boolean().optional(),
  })
  .strict();

export const DealerApplicationListQuerySchema = PaginationSchema.extend({
  status: DealerApplicationStatusSchema.optional(),
  country: z.string().min(1).optional(),
  applicant_user_id: EntityIdSchema.optional(),
});

export const DealerCompanyUpdateSchema = z
  .object({
    legal_name: z.string().min(1).optional(),
    display_name: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    website: z.string().url().nullable().optional(),
    business_type: z.string().min(1).optional(),
    tax_id: z.string().min(1).nullable().optional(),
    tier_id: EntityIdSchema.nullable().optional(),
    price_list_id: EntityIdSchema.nullable().optional(),
    currency: z.string().length(3).optional(),
    payment_terms: z.string().min(1).optional(),
    sales_territories: JsonValueSchema.optional(),
    authorized_categories: JsonValueSchema.optional(),
    sales_rep: z.string().min(1).nullable().optional(),
    public_listing: z.boolean().optional(),
    status: DealerCompanyStatusSchema.optional(),
  })
  .strict();

export const DealerCompanyListQuerySchema = PaginationSchema.extend({
  status: DealerCompanyStatusSchema.optional(),
  country: z.string().min(1).optional(),
});

export const DealerMemberCreateSchema = z
  .object({
    user_id: EntityIdSchema,
    role: z.string().min(1),
    permissions: z.array(z.string().min(1)),
  })
  .strict();

export const DealerMemberListQuerySchema = PaginationSchema.extend({
  company_id: EntityIdSchema.optional(),
  status: DealerMemberStatusSchema.optional(),
});

export const DealerAddressCreateSchema = z
  .object({
    kind: z.string().min(1),
    payload: JsonValueSchema,
    public_listing: JsonValueSchema.nullable().optional().default(null),
  })
  .strict();

export const DealerPublicListingListQuerySchema = PaginationSchema.extend({
  country: z.string().min(1).optional(),
});

export const DealerApplicationMutationResponseSchema =
  createItemResponseSchema(DealerApplicationSchema);
export const DealerApplicationListResponseSchema =
  createListResponseSchema(DealerApplicationSchema);
export const DealerApplicationReviewResultSchema = createItemResponseSchema(
  z
    .object({
      application: DealerApplicationSchema,
      company: DealerCompanySchema.nullable(),
      member: DealerMemberSchema.nullable(),
    })
    .strict()
    .passthrough(),
);

export const DealerCompanyMutationResponseSchema =
  createItemResponseSchema(DealerCompanySchema);
export const DealerCompanyListResponseSchema =
  createListResponseSchema(DealerCompanySchema);

export const DealerMemberMutationResponseSchema =
  createItemResponseSchema(DealerMemberSchema);
export const DealerMemberListResponseSchema =
  createListResponseSchema(DealerMemberSchema);

export const DealerAddressMutationResponseSchema =
  createItemResponseSchema(DealerAddressSchema);
export const DealerAddressListResponseSchema =
  createListResponseSchema(DealerAddressSchema);

export const DealerPublicListingListResponseSchema =
  createListResponseSchema(DealerPublicListingSchema);

export type DealerApplicationStatus = z.infer<
  typeof DealerApplicationStatusSchema
>;
export type DealerCompanyStatus = z.infer<typeof DealerCompanyStatusSchema>;
export type DealerMemberStatus = z.infer<typeof DealerMemberStatusSchema>;
export type DealerContext = z.infer<typeof DealerContextSchema>;
export type DealerApplication = z.infer<typeof DealerApplicationSchema>;
export type DealerCompany = z.infer<typeof DealerCompanySchema>;
export type DealerMember = z.infer<typeof DealerMemberSchema>;
export type DealerAddress = z.infer<typeof DealerAddressSchema>;
export type DealerPublicListing = z.infer<typeof DealerPublicListingSchema>;
export type DealerApplicationCreateInput = z.infer<
  typeof DealerApplicationCreateSchema
>;
export type DealerApplicationReviewInput = z.infer<
  typeof DealerApplicationReviewSchema
>;
export type DealerApplicationSubmitInput = z.infer<
  typeof DealerApplicationSubmitSchema
>;
export type DealerCompanyUpdateInput = z.infer<typeof DealerCompanyUpdateSchema>;
export type DealerMemberCreateInput = z.infer<typeof DealerMemberCreateSchema>;
export type DealerAddressCreateInput = z.infer<typeof DealerAddressCreateSchema>;
