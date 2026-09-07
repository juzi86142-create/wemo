import { describe, expect, it } from "vitest";

import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("返回稳定的健康状态", () => {
    expect(new HealthService().getHealth()).toEqual({
      service: "wemove-api",
      status: "ok",
    });
  });
});
