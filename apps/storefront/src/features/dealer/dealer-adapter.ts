import {
  DealerApplicationCreateSchema,
  DealerApplicationMutationResponseSchema,
  DealerPublicListingListResponseSchema,
  type DealerApplication,
  type DealerApplicationCreateInput,
  type DealerPublicListing,
} from "@wemo/contracts";

import { ApiError, requestJson, toQueryString } from "../platform/api-client";

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
  try {
    const response = DealerPublicListingListResponseSchema.parse(
      await requestJson<unknown>("/dealer/public-listings?" + toQueryString(query)),
    );
    return {
      items: response.items,
      page: response.page,
      pageSize: response.page_size,
      total: response.total,
      error: undefined,
    };
  } catch (error) {
    return {
      items: [],
      page: query.page,
      pageSize: query.page_size,
      total: 0,
      error: error instanceof ApiError ? error : new ApiError("Dealer listings are unavailable.", 0),
    };
  }
}

export async function createDealerApplication(input: DealerApplicationCreateInput): Promise<DealerApplication> {
  const parsed = DealerApplicationCreateSchema.parse(input);
  const response = DealerApplicationMutationResponseSchema.parse(
    await requestJson<unknown>("/dealer/applications", {
      method: "POST",
      body: JSON.stringify(parsed),
    }),
  );
  return response.item;
}
