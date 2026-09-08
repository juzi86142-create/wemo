import { describe, expect, it } from "vitest";

import { getCartItemCount } from "./cart-count";

describe("getCartItemCount", () => {
  it("counts visible cart items", () => {
    expect(getCartItemCount({ items: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }] })).toBe(3);
  });
});
