import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { createApiApp } from "../../src/bootstrap";

// 本地 docker postgres 已就绪
process.env.DATABASE_URL ??=
  "postgresql://wemove:wemove@localhost:5432/wemove";

describe("Health & Localization API Integration（真实数据库）", () => {
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

  it("health check 返回健康状态", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      service: "wemove-api",
      status: "ok",
    });
  });

  it("localization languages 返回语言列表", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/localization/languages",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("items");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]).toHaveProperty("code");
  });

  it("localization markets 返回市场列表", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/localization/markets",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("items");
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("catalog products 返回产品列表", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/catalog/products",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("catalog categories 返回分类列表", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/catalog/categories",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });
});
