import { describe, expect, it } from "vitest";

import { adminMetrics, adminNav } from "./admin-fixtures";

describe("admin fixtures", () => {
  it("contains the six admin destinations and four dashboard metrics", () => {
    expect(adminNav.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/products",
      "/admin/orders",
      "/admin/dealers",
      "/admin/content",
      "/admin/settings",
    ]);
    expect(adminMetrics).toHaveLength(4);
  });
});
