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

  it("auth 登录发放随机会话令牌", async () => {
    const response = await server!.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: "admin@wemove.com", password: "Demo1234!" },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.item.token).toBeTypeOf("string");
    expect(body.item.token.length).toBeGreaterThanOrEqual(32);
    expect(body.item.audience).toBe("staff");
  });

  it("Bearer 令牌访问后台审计日志", async () => {
    const login = await server!.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: "admin@wemove.com", password: "Demo1234!" },
    });
    const token = JSON.parse(login.body).item.token as string;

    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/admin/audit-logs",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toBeTypeOf("object");
  });

  it("经销商登录后可访问本企业资料", async () => {
    const login = await server!.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: "dealer@example.com", password: "Demo1234!" },
    });
    const token = JSON.parse(login.body).item.token as string;

    const response = await server!.inject({
      method: "GET",
      url: "/api/v1/dealer/company",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.item.display_name).toBe("Demo Sports");
  });

  it("checkout 创建 B2C 订单并固化价格", async () => {
    const login = await server!.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: "user@example.com", password: "Demo1234!" },
    });
    const token = JSON.parse(login.body).item.token as string;

    const response = await server!.inject({
      method: "POST",
      url: "/api/v1/checkout",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      payload: {
        items: [{ variant_id: 3, quantity: 1 }],
        contact: { email: "user@example.com", name: "Demo User" },
        shipping_address: { line1: "1 Demo St", city: "NY", country: "US" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.item.channel).toBe("b2c");
    expect(body.item.status).toBe("pending_payment");
    expect(body.item.total_minor).toBeGreaterThan(0);
  });
});
