import { describe, expect, it } from "vitest";

import { buildQueryHref } from "../platform/pagination";

describe("catalog filters", () => {
  it("keeps the current search when changing the sort", () => {
    expect(buildQueryHref("/products", "q=bowling&page=2", { sort: "newest", page: 1 })).toBe(
      "/products?q=bowling&page=1&sort=newest",
    );
  });
});
