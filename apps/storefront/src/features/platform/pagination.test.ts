import { describe, expect, it } from "vitest";

import { buildPageHref, parsePageParams } from "./pagination";

describe("pagination", () => {
  it("clamps invalid values and preserves the query", () => {
    expect(
      parsePageParams(new URLSearchParams("page=-2&pageSize=200&q=bowling")),
    ).toEqual({ page: 1, pageSize: 48, q: "bowling" });
  });

  it("changes the page without losing filters", () => {
    expect(buildPageHref("/products", "q=bowling&sort=newest", 3)).toBe(
      "/products?q=bowling&sort=newest&page=3",
    );
  });
});
