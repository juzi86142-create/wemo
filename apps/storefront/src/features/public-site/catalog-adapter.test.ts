import { describe, expect, it } from "vitest";

import { formatAgeRange, getPreviewProducts, getProductImageAlt } from "./catalog-adapter";

describe("catalog presentation adapters", () => {
  it("renders safe copy for nullable product fields", () => {
    const product = getPreviewProducts()[0];
    expect(product).toBeDefined();
    if (!product) throw new Error("Preview product fixture is missing");
    expect(formatAgeRange(product.age_min, product.age_max)).toBe("3–8");
    expect(getProductImageAlt(product)).toContain(product.name);
    expect(product.primary_image_url).toContain("googleusercontent.com");
    expect({ ...product, primary_image_url: null }.primary_image_url).toBeNull();
  });

  it("supports an open-ended age range", () => {
    expect(formatAgeRange(null, 12)).toBe("Up to 12");
    expect(formatAgeRange(5, null)).toBe("5+");
    expect(formatAgeRange(null, null)).toBe("All ages");
  });
});
