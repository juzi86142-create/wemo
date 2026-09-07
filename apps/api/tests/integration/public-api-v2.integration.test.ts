import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDatabase, type DatabaseClient } from "@wemo/database";

import { createApiApp } from "../../src/bootstrap";
import { databaseIntegrationEnabled } from "../../src/runtime/integration-database.fixture";

// Override the environment variable to force enable database integration tests
process.env.RUN_DATABASE_INTEGRATION = "1";
process.env.DATABASE_URL ??=
  "postgresql://wemove:wemove@localhost:5432/wemove";

const describeDatabase = databaseIntegrationEnabled() ? describe : describe.skip;

/** Simple database reset using raw SQL */
async function resetDatabase(database: DatabaseClient): Promise<void> {
  const tables = await database.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_catalog.pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  for (const table of tables) {
    if (!/^[a-zA-Z0-9_]+$/.test(table.tablename)) continue;
    await database.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${table.tablename}" RESTART IDENTITY CASCADE`,
    );
  }
}

describeDatabase("Health & Localization API Integration（真实数据库）", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let server: FastifyInstance;
  let db: DatabaseClient;

  beforeAll(async () => {
    // Create a database client for reset/seeding
    db = createDatabase();
    await db.$connect();

    // Reset database
    await resetDatabase(db);
    await db.$disconnect();

    // Import and run the test seed script (this is test code)
    const { main } = await import("../seed.ts");
    await main();

    // Create and initialize the API app
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
