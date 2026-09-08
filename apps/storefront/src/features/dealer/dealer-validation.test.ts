import { describe, expect, it } from "vitest";

import { validateDealerApplication, type DealerApplicationFormValues } from "./dealer-validation";

const validValues: DealerApplicationFormValues = {
  legalName: "Demo Sports Ltd",
  displayName: "Demo Sports",
  country: "GB",
  website: "https://demo.example.com",
  businessType: "Retail",
  taxId: "GB123456",
  contactName: "Alex Smith",
  contactEmail: "alex@example.com",
  contactPhone: "+44 20 5555 0100",
  currency: "GBP",
};

describe("dealer application validation", () => {
  it("accepts a complete application with optional values", () => {
    expect(validateDealerApplication(validValues)).toEqual({});
  });

  it("requires stable business and contact field keys", () => {
    const errors = validateDealerApplication({
      ...validValues,
      legalName: "",
      displayName: "",
      country: "",
      businessType: "",
      contactName: "",
      contactEmail: "",
      currency: "",
    });

    expect(errors).toMatchObject({
      legalName: expect.any(String),
      displayName: expect.any(String),
      country: expect.any(String),
      businessType: expect.any(String),
      contactName: expect.any(String),
      contactEmail: expect.any(String),
      currency: expect.any(String),
    });
  });

  it("rejects malformed email, website, and currency values", () => {
    const errors = validateDealerApplication({
      ...validValues,
      contactEmail: "not-an-email",
      website: "not-a-url",
      currency: "GB",
    });

    expect(errors).toMatchObject({
      contactEmail: expect.any(String),
      website: expect.any(String),
      currency: expect.any(String),
    });
  });

  it("allows optional website, tax id, and phone to be empty", () => {
    expect(
      validateDealerApplication({
        ...validValues,
        website: "",
        taxId: "",
        contactPhone: "",
      }),
    ).toEqual({});
  });
});
