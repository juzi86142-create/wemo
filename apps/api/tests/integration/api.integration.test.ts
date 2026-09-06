import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { createApiApp } from "../../src/bootstrap";

// 本地 docker postgres 已就绪；PrismaClient 初始化时读取 DATABASE_URL。
process.env.DATABASE_URL ??=
  "postgresql://wemove:wemove@localhost:5432/wemove";

describe("API integration（真实数据库）", () => {
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
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].code).toBeTypeOf("string");
  });

  it("localization markets", async () => {
    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/localization/markets",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("catalog 产品列表（seed 数据）", async () => {
    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/catalog/products",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].name).toBeTypeOf("string");
  });
});
