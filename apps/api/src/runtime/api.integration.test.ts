import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { createApiApp } from "../bootstrap";

function staffHeaders() {
  return {
    "x-wemo-actor": JSON.stringify({
      user_id: 7,
      audience: "staff",
      permissions: [
        "settings:read",
        "settings:write",
        "audit:read",
        "jobs:read",
        "jobs:write",
        "reports:read",
        "integrations:read",
        "analytics:read",
      ],
    }),
  };
}

describe("API runtime integration", () => {
  const state = {
    app: null as Awaited<ReturnType<typeof createApiApp>> | null,
    server: null as FastifyInstance | null,
  };

  beforeAll(async () => {
    state.app = await createApiApp({ logger: false });
    await state.app.init();
    state.server = state.app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await state.app?.close();
  });

  it("serves health with request id", async () => {
    const response = await state.server!.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(JSON.parse(response.body)).toEqual({
      service: "wemove-api",
      status: "ok",
    });
  });

  it("rejects staff routes without actor context", async () => {
    const response = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/settings",
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      code: "UNAUTHORIZED",
      request_id: response.headers["x-request-id"],
    });
  });

  it("returns settings snapshot and audit trail", async () => {
    const headers = staffHeaders();
    const before = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/settings",
      headers,
    });

    expect(before.statusCode).toBe(200);

    const update = await state.server!.inject({
      method: "PATCH",
      url: "/api/v1/admin/settings",
      headers,
      payload: {
        group_name: "platform",
        key: "default_market",
        value: "asia",
        expected_version: "1",
      },
    });

    expect(update.statusCode).toBe(200);
    const updateBody = JSON.parse(update.body) as {
      request_id: string;
      item: { group_name: string; key: string; version: string; value: string };
    };
    expect(updateBody.item.version).toBe("2");
    expect(updateBody.request_id).toBeTruthy();

    const audit = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/audit-logs?entity=system_setting",
      headers,
    });

    expect(audit.statusCode).toBe(200);
    const auditBody = JSON.parse(audit.body) as { total: number };
    expect(auditBody.total).toBeGreaterThan(0);
  });

  it("deduplicates jobs by idempotency key", async () => {
    const headers = staffHeaders();
    const payload = {
      kind: "webhook",
      payload: { provider: "erp" },
      idempotency_key: "job-001",
    };

    const first = await state.server!.inject({
      method: "POST",
      url: "/api/v1/admin/jobs",
      headers,
      payload,
    });
    const second = await state.server!.inject({
      method: "POST",
      url: "/api/v1/admin/jobs",
      headers,
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstBody = JSON.parse(first.body) as {
      item: { id: number; status: string };
    };
    const secondBody = JSON.parse(second.body) as {
      item: { id: number; status: string };
    };
    expect(secondBody.item.id).toBe(firstBody.item.id);

    const list = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/jobs",
      headers,
    });
    expect(JSON.parse(list.body)).toMatchObject({ total: 1 });
  });

  it("ingests webhooks idempotently", async () => {
    const payload = {
      event: "order.updated",
      idempotency_key: "erp-1",
      payload: { order_no: "SO-001" },
    };

    const first = await state.server!.inject({
      method: "POST",
      url: "/api/v1/integrations/webhooks/erp",
      headers: { "x-wemo-signature": "demo:erp" },
      payload,
    });
    const second = await state.server!.inject({
      method: "POST",
      url: "/api/v1/integrations/webhooks/erp",
      headers: { "x-wemo-signature": "demo:erp" },
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toMatchObject({
      item: { status: "accepted" },
    });
    expect(second.statusCode).toBe(200);
    expect(JSON.parse(second.body)).toMatchObject({
      item: { status: "duplicate" },
    });

    const list = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/integrations/deliveries?provider=erp",
      headers: staffHeaders(),
    });

    expect(JSON.parse(list.body)).toMatchObject({ total: 1 });
  });

  it("records analytics and produces report snapshots", async () => {
    const analytics = await state.server!.inject({
      method: "POST",
      url: "/api/v1/analytics/events",
      payload: {
        events: [
          {
            name: "view_home",
            payload: { section: "hero" },
            market: "global",
            locale: "en-US",
            device: "desktop",
            role: "guest",
          },
          {
            name: "search",
            payload: { query: "bowling", results_count: 0 },
            market: "global",
            locale: "en-US",
            device: "desktop",
            role: "guest",
          },
        ],
      },
    });

    expect(analytics.statusCode).toBe(200);
    expect(JSON.parse(analytics.body)).toMatchObject({
      accepted: 2,
      deduplicated: 0,
    });

    const report = await state.server!.inject({
      method: "GET",
      url: "/api/v1/admin/reports/search",
      headers: staffHeaders(),
    });

    expect(report.statusCode).toBe(200);
    expect(JSON.parse(report.body)).toMatchObject({
      kind: "search",
    });
  });
});
