import { describe, expect, it } from "vitest";

import {
  DealerAddressCreateSchema,
  DealerApplicationCreateSchema,
  DealerApplicationReviewSchema,
  DealerApplicationReviewResultSchema,
  DealerPublicListingListQuerySchema,
} from "./index.js";

const timestamp = "2026-09-05T00:00:00.000Z";

describe("dealers contracts", () => {
  it("parses dealer application and address inputs", () => {
    expect(
      DealerApplicationCreateSchema.parse({
        legal_name: "Demo Toys Ltd.",
        display_name: "Demo Toys",
        country: "US",
        website: "https://demo.example.com",
        business_type: "distributor",
        contact_name: "Dealer Admin",
        contact_email: "dealer@example.com",
        currency: "USD",
      }),
    ).toMatchObject({
      legal_name: "Demo Toys Ltd.",
      currency: "USD",
      payload: {},
    });

    expect(
      DealerAddressCreateSchema.parse({
        kind: "shipping",
        payload: { city: "Los Angeles" },
        public_listing: null,
      }),
    ).toMatchObject({
      kind: "shipping",
      public_listing: null,
    });
  });

  it("parses review results and public listing queries", () => {
    expect(
      DealerApplicationReviewSchema.parse({
        decision: "under_review",
        reason: "waiting for attachment",
      }),
    ).toMatchObject({
      decision: "under_review",
    });

    expect(
      DealerApplicationReviewResultSchema.parse({
        request_id: "req_002",
        item: {
          application: {
            id: 1,
            application_no: "DA-000001",
            applicant_user_id: 2,
            company_id: 3,
            legal_name: "Demo Toys Ltd.",
            display_name: "Demo Toys",
            country: "US",
            website: "https://demo.example.com",
            business_type: "distributor",
            tax_id: null,
            contact_name: "Dealer Admin",
            contact_email: "dealer@example.com",
            contact_phone: null,
            currency: "USD",
            payload: {},
            status: "approved",
            submitted_at: timestamp,
            reviewed_at: timestamp,
            review_note: "ok",
            created_at: timestamp,
            updated_at: timestamp,
          },
          company: {
            id: 3,
            legal_name: "Demo Toys Ltd.",
            display_name: "Demo Toys",
            country: "US",
            website: "https://demo.example.com",
            business_type: "distributor",
            tax_id: null,
            tier_id: null,
            price_list_id: null,
            currency: "USD",
            payment_terms: "Net 30",
            sales_territories: { countries: ["US"] },
            authorized_categories: { ids: [] },
            sales_rep: null,
            public_listing: true,
            status: "active",
            created_at: timestamp,
            archived_at: null,
          },
          member: null,
        },
      }),
    ).toMatchObject({
      item: {
        application: { status: "approved" },
        company: { currency: "USD" },
      },
    });

    expect(
      DealerPublicListingListQuerySchema.parse({
        country: "US",
        page_size: 10,
      }),
    ).toEqual({
      country: "US",
      page: 1,
      page_size: 10,
    });
  });
});
