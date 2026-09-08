import { describe, expect, it } from "vitest";

import { validatePaymentSelection } from "./payment-methods";

describe("validatePaymentSelection", () => {
  it("requires a payment method before review", () => {
    expect(validatePaymentSelection({ method: "" })).toEqual({ method: "Choose a payment method." });
  });
});
