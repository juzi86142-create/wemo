import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DealerApplication } from "@wemo/contracts";

import { ApiError, requestJson } from "../platform/api-client";
import { createDealerApplication, getPublicDealerListings } from "./dealer-adapter";

vi.mock("../platform/api-client", async () => {
  const actual = await vi.importActual<typeof import("../platform/api-client")>(
    "../platform/api-client",
  );
  return { ...actual, requestJson: vi.fn() };
});

const requestJsonMock = vi.mocked(requestJson);

const application: DealerApplication = {
  id: 801,
  application_no: "APP-1",
  applicant_user_id: null,
  company_id: null,
  legal_name: "Demo Sports Ltd",
  display_name: "Demo Sports",
  country: "GB",
  website: "https://demo.example.com",
  business_type: "Retail",
  tax_id: null,
  contact_name: "Alex Smith",
  contact_email: "alex@example.com",
  contact_phone: null,
  currency: "GBP",
  payload: {},
  status: "submitted",
  submitted_at: "2026-09-08T00:00:00.000Z",
  reviewed_at: null,
  review_note: null,
  created_at: "2026-09-08T00:00:00.000Z",
  updated_at: "2026-09-08T00:00:00.000Z",
};

const validInput = {
  legal_name: "Demo Sports Ltd",
  display_name: "Demo Sports",
  country: "GB",
  website: "https://demo.example.com",
  business_type: "Retail",
  contact_name: "Alex Smith",
  contact_email: "alex@example.com",
  currency: "GBP",
  payload: {},
};

beforeEach(() => {
  requestJsonMock.mockReset();
});

describe("dealer API adapters", () => {
  it("requests public listings with the country filter", async () => {
    requestJsonMock.mockResolvedValue({
      request_id: "req-1",
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
    });

    await expect(
      getPublicDealerListings({ page: 1, page_size: 20, country: "GB" }),
    ).resolves.toMatchObject({ items: [], total: 0 });

    expect(requestJsonMock).toHaveBeenCalledWith(
      "/dealer/public-listings?page=1&page_size=20&country=GB",
    );
  });

  it("validates an application response and rejects malformed payloads", async () => {
    requestJsonMock.mockResolvedValue({ request_id: "req-2", item: application });

    await expect(createDealerApplication(validInput)).resolves.toMatchObject({
      application_no: "APP-1",
    });

    requestJsonMock.mockResolvedValue({
      request_id: "req-3",
      item: { status: "submitted" },
    });
    await expect(createDealerApplication(validInput)).rejects.toThrow();
  });

  it("returns an unavailable page result without fabricated listings", async () => {
    requestJsonMock.mockRejectedValue(new ApiError("Offline", 0, "req-4"));

    await expect(getPublicDealerListings({ page: 1, page_size: 20 })).resolves.toMatchObject({
      items: [],
      total: 0,
      error: { requestId: "req-4" },
    });
  });
});
