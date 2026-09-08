import { describe, expect, it } from "vitest";
import type { Cart } from "@wemo/contracts";

import type { CheckoutFormValues } from "./checkout-validation";
import { buildCheckoutInput } from "./checkout-payload";

const cart = { items: [{ variant_id: 1001, quantity: 1 }] } as Cart;
const values: CheckoutFormValues = { name: "Alex", email: "alex@example.com", phone: "", addressLine1: "1 Main", addressLine2: "", city: "London", region: "", postalCode: "SW1", country: "GB", couponCode: "", note: "Leave at door" };

describe("buildCheckoutInput", () => {
  it("carries card payment and billing details into the checkout contract", () => {
    expect(buildCheckoutInput(cart, values, { method: "card", billingName: "Alex Green", billingAddress: "2 Billing Road" })).toMatchObject({
      payment_method: "card",
      billing_address: { name: "Alex Green", line1: "2 Billing Road" },
    });
  });

  it("keeps an invoice purchase order in the supported note field", () => {
    expect(buildCheckoutInput(cart, values, { method: "invoice_po", purchaseOrder: "PO-42" })).toMatchObject({
      payment_method: "invoice_po",
      note: "Leave at door\nPurchase order: PO-42",
    });
  });
});
