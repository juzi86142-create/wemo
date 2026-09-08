import { describe, expect, it } from "vitest";

import { readPublicAddress } from "./dealer-display";

describe("public dealer display helpers", () => {
  it("allowlists known address strings", () => {
    expect(
      readPublicAddress({
        line1: "1 Main Street",
        city: "London",
        region: "Greater London",
        postal_code: "SW1A 1AA",
        country: "GB",
        phone: "+44 20 5555 0100",
        internal_note: "do not display",
      }),
    ).toEqual({
      line1: "1 Main Street",
      city: "London",
      region: "Greater London",
      postalCode: "SW1A 1AA",
      country: "GB",
      phone: "+44 20 5555 0100",
    });
  });

  it("returns no display values for unknown or unsafe payloads", () => {
    expect(readPublicAddress({ address: { city: "London" } })).toEqual({});
    expect(readPublicAddress({ city: 42, country: null })).toEqual({});
    expect(readPublicAddress(null)).toEqual({});
  });
});
