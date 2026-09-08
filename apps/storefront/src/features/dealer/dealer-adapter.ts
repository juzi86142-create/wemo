import {
  DealerApplicationCreateSchema,
  DealerApplicationMutationResponseSchema,
  DealerPublicListingListResponseSchema,
  type DealerApplication,
  type DealerApplicationCreateInput,
  type DealerPublicListing,
} from "@wemo/contracts";

import { ApiError } from "../platform/api-client";

const DEMO_TIMESTAMP = "2026-09-08T00:00:00.000Z";

const demoDealerListings = DealerPublicListingListResponseSchema.parse({
  items: [
    {
      company: {
        id: 201,
        legal_name: "Northline Play Company LLC",
        display_name: "Northline Play Co.",
        country: "US",
        website: "https://example.com/northline-play",
        business_type: "Retail partner",
        tax_id: null,
        tier_id: null,
        price_list_id: null,
        currency: "USD",
        payment_terms: "Demo only",
        sales_territories: ["US-WEST"],
        authorized_categories: ["active-play"],
        sales_rep: null,
        public_listing: true,
        status: "active",
        created_at: DEMO_TIMESTAMP,
        archived_at: null,
      },
      addresses: [
        {
          id: 301,
          company_id: 201,
          kind: "store",
          payload: {},
          public_listing: {
            line1: "1128 Alder Way",
            city: "Portland",
            region: "OR",
            postal_code: "97205",
            country: "US",
            phone: "+1 503 555 0148",
          },
          created_at: DEMO_TIMESTAMP,
        },
      ],
    },
    {
      company: {
        id: 202,
        legal_name: "Bright Field Recreation Ltd.",
        display_name: "Bright Field Recreation",
        country: "CA",
        website: "https://example.com/bright-field",
        business_type: "Education supplier",
        tax_id: null,
        tier_id: null,
        price_list_id: null,
        currency: "CAD",
        payment_terms: "Demo only",
        sales_territories: ["CA"],
        authorized_categories: ["outdoor-play"],
        sales_rep: null,
        public_listing: true,
        status: "active",
        created_at: DEMO_TIMESTAMP,
        archived_at: null,
      },
      addresses: [
        {
          id: 302,
          company_id: 202,
          kind: "showroom",
          payload: {},
          public_listing: {
            line1: "84 Harbour Street",
            city: "Toronto",
            region: "ON",
            postal_code: "M5J 1B7",
            country: "CA",
            phone: "+1 416 555 0182",
          },
          created_at: DEMO_TIMESTAMP,
        },
      ],
    },
  ],
  page: 1,
  page_size: 20,
  total: 2,
}).items;

export interface DealerPageData {
  items: DealerPublicListing[];
  page: number;
  pageSize: number;
  total: number;
  error: ApiError | undefined;
}

export interface DealerListingQuery extends Record<string, string | number | undefined> {
  page: number;
  page_size: number;
  country?: string;
}

export async function getPublicDealerListings(query: DealerListingQuery): Promise<DealerPageData> {
  const filtered = query.country
    ? demoDealerListings.filter((item) => item.company.country === query.country)
    : demoDealerListings;
  const start = (query.page - 1) * query.page_size;
  return {
    items: filtered.slice(start, start + query.page_size),
    page: query.page,
    pageSize: query.page_size,
    total: filtered.length,
    error: undefined,
  };
}

export async function createDealerApplication(input: DealerApplicationCreateInput): Promise<DealerApplication> {
  const parsed = DealerApplicationCreateSchema.parse(input);
  const response = DealerApplicationMutationResponseSchema.parse(
    {
      request_id: `demo-dealer-${Date.now()}`,
      item: {
        id: Date.now(),
        application_no: `DEMO-${Date.now().toString().slice(-6)}`,
        applicant_user_id: 101,
        company_id: null,
        legal_name: parsed.legal_name,
        display_name: parsed.display_name,
        country: parsed.country,
        website: parsed.website ?? null,
        business_type: parsed.business_type,
        tax_id: parsed.tax_id ?? null,
        contact_name: parsed.contact_name,
        contact_email: parsed.contact_email,
        contact_phone: parsed.contact_phone ?? null,
        currency: parsed.currency,
        payload: parsed.payload,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        review_note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  );
  return response.item;
}
