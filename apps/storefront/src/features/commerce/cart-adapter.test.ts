import { describe, expect, it } from "vitest";

import { cartItemName, formatMoney, getPreviewCart, replacePreviewQuantity } from "./cart-adapter";

describe("cart adapter", () => {
  it("formats server money without hard-coded currency symbols", () => {
    expect(formatMoney(3200, "USD")).toBe("$32.00");
    expect(formatMoney(3200, "EUR")).toBe("€32.00");
  });

  it("recalculates preview quantities from item prices", () => {
    const cart = replacePreviewQuantity(getPreviewCart(), 1, 2);
    expect(cart.items[0]?.line_total_minor).toBe(6400);
    expect(cart.total_minor).toBe(10800);
    expect(cartItemName(cart.items[0]!)).toBe("Roll & Play Bowling Set");
  });
});
