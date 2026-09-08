import { describe, expect, it } from "vitest";

import { createDealerApplication, getPublicDealerListings } from "./dealer-adapter";

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

describe("dealer demo adapters", () => {
  it("filters local public listings by country", async () => {
    await expect(
      getPublicDealerListings({ page: 1, page_size: 20, country: "US" }),
    ).resolves.toMatchObject({
      total: 1,
      items: [{ company: { display_name: "Northline Play Co.", country: "US" } }],
      error: undefined,
    });
  });

  it("creates a contract-valid local application", async () => {
    await expect(createDealerApplication(validInput)).resolves.toMatchObject({
      legal_name: validInput.legal_name,
      contact_email: validInput.contact_email,
      status: "submitted",
    });

    await expect(
      createDealerApplication({ ...validInput, contact_email: "invalid" }),
    ).rejects.toThrow();
  });

  it("returns the complete local dealer collection", async () => {
    await expect(getPublicDealerListings({ page: 1, page_size: 20 })).resolves.toMatchObject({
      total: 2,
      error: undefined,
    });
  });
});
