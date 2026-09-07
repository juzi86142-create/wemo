import { describe, expect, it } from "vitest";

import { validateCheckoutFields, type CheckoutFormValues } from "./checkout-validation";

const emptyValues: CheckoutFormValues = {
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  couponCode: "",
  note: "",
};

describe("validateCheckoutFields", () => {
  it("requires contact and shipping fields", () => {
    expect(validateCheckoutFields(emptyValues)).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      addressLine1: expect.any(String),
      city: expect.any(String),
      postalCode: expect.any(String),
      country: expect.any(String),
    });
  });

  it("accepts a valid guest checkout form", () => {
    expect(
      validateCheckoutFields({
        ...emptyValues,
        name: "Alex Example",
        email: "alex@example.com",
        addressLine1: "1 Main Street",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "GB",
      }),
    ).toEqual({});
  });

  it("rejects malformed email without rejecting optional values", () => {
    expect(
      validateCheckoutFields({
        ...emptyValues,
        name: "Alex Example",
        email: "not-an-email",
        addressLine1: "1 Main Street",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "GB",
        couponCode: "MOVE10",
        note: "Leave at the door",
      }),
    ).toMatchObject({ email: expect.any(String) });
  });
});
