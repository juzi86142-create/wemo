import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { createApiApp } from "../../src/bootstrap";

describe.skip("API integration (需要数据库连接)", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let server: FastifyInstance;

  beforeAll(async () => {
    app = await createApiApp({ logger: false });
    await app.init();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("health check", async () => {
    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/health",
    });
    expect(response.statusCode).toBe(200);
  });

  it("localization languages", async () => {
    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/localization/languages",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("OK");
  });
});
