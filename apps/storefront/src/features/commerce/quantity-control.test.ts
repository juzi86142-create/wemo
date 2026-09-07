import { describe, expect, it } from "vitest";

import { normalizeQuantity } from "./quantity-control";

describe("normalizeQuantity", () => {
  it("keeps quantities in the available range", () => {
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(2.9)).toBe(2);
    expect(normalizeQuantity(100)).toBe(99);
  });
});
