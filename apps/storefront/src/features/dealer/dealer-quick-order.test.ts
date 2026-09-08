import { describe, expect, it } from "vitest";
import { validateQuickOrderRows } from "./dealer-fixtures";

describe("quick-order validation", () => {
  it("rejects quick-order rows without a SKU or positive quantity", () => {
    expect(validateQuickOrderRows([{ sku: "", quantity: 0 }])).toEqual({
      0: { sku: "Enter a SKU.", quantity: "Enter a quantity." },
    });
  });
});
