import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApp } from "../bootstrap";

const staffPermissions = [
  "catalog:read",
  "content:read",
  "media:read",
  "seo:read",
  "forms:read",
  "forms:write",
  "notifications:read",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "payments:read",
  "returns:write",
  "quotes:write",
  "analytics:read",
  "reports:read",
];

function requestHeaders(requestId: string) {
  return {
    "x-request-id": requestId,
  };
}

function staffHeaders(requestId: string, companyId: number | null = 1) {
  const actor: Record<string, unknown> = {
    user_id: 7,
    audience: "staff",
    permissions: staffPermissions,
  };
  if (companyId !== null) {
    actor.company_id = companyId;
  }
  return {
    "x-request-id": requestId,
    "x-wemo-actor": JSON.stringify(actor),
  };
}

function dealerHeaders(requestId: string, companyId: number) {
  return {
    "x-request-id": requestId,
    "x-wemo-actor": JSON.stringify({
      user_id: 77,
      audience: "dealer",
      company_id: companyId,
      permissions: ["dealer:read"],
    }),
  };
}

function parseBody<T>(response: { body: string }): T {
  return JSON.parse(response.body) as T;
}

function findBalance(body: { items: Array<{ variant_id: number }> }, variantId: number) {
  return body.items.find((entry) => entry.variant_id === variantId);
}

describe("experience and commerce integration", () => {
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

  it("serves the public experience surface and cart pricing", async () => {
    const server = state.server!;

    const cartOpen = await server.inject({
      method: "GET",
      url: "/api/v1/cart?market=global&currency=USD",
      headers: requestHeaders("exp-cart-open"),
    });
    expect(cartOpen.statusCode).toBe(200);
    expect(parseBody<{ item: { channel: string; items: unknown[] } }>(cartOpen)).toMatchObject({
      item: {
        channel: "guest",
        items: [],
      },
    });

    const cartAdd = await server.inject({
      method: "POST",
      url: "/api/v1/cart/items",
      headers: requestHeaders("exp-cart-add"),
      payload: {
        variant_id: 2,
        quantity: 2,
      },
    });
    expect(cartAdd.statusCode).toBe(200);
    expect(
      parseBody<{ request_id: string; item: { id: number; subtotal_minor: number; items: Array<{ unit_price_minor: number; line_total_minor: number }> } }>(cartAdd),
    ).toMatchObject({
      request_id: "exp-cart-add",
      item: {
        subtotal_minor: 7998,
        items: [
          {
            unit_price_minor: 3999,
            line_total_minor: 7998,
          },
        ],
      },
    });

    const cartRead = await server.inject({
      method: "GET",
      url: "/api/v1/cart?market=global&currency=USD",
      headers: requestHeaders("exp-cart-read"),
    });
    expect(cartRead.statusCode).toBe(200);
    expect(
      parseBody<{ item: { channel: string; items: Array<{ variant_id: number }> } }>(cartRead),
    ).toMatchObject({
      item: {
        channel: "guest",
        items: [{ variant_id: 2 }],
      },
    });

    const products = await server.inject({
      method: "GET",
      url: "/api/v1/catalog/products?market=global&page=1&page_size=10",
      headers: requestHeaders("exp-catalog-list"),
    });
    expect(products.statusCode).toBe(200);
    expect(
      parseBody<{ total: number; items: Array<{ slug: string }> }>(products),
    ).toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ slug: "demo-bus" }),
        expect.objectContaining({ slug: "demo-racer" }),
      ]),
    });

    const product = await server.inject({
      method: "GET",
      url: "/api/v1/catalog/products/demo-bus",
      headers: requestHeaders("exp-catalog-detail"),
    });
    expect(product.statusCode).toBe(200);
    expect(
      parseBody<{ item: { slug: string; variants: Array<{ sku: string }> } }>(product),
    ).toMatchObject({
      item: {
        slug: "demo-bus",
        variants: [{ sku: "BUS-001" }],
      },
    });

    const content = await server.inject({
      method: "GET",
      url: "/api/v1/cms/entries/home",
      headers: requestHeaders("exp-cms-home"),
    });
    expect(content.statusCode).toBe(200);
    expect(
      parseBody<{ item: { slug: string; status: string } }>(content),
    ).toMatchObject({
      item: {
        slug: "home",
        status: "published",
      },
    });

    const navigation = await server.inject({
      method: "GET",
      url: "/api/v1/cms/navigation",
      headers: requestHeaders("exp-cms-navigation"),
    });
    expect(navigation.statusCode).toBe(200);
    expect(parseBody<{ total: number; items: Array<{ slug: string }> }>(navigation)).toMatchObject({
      total: 1,
      items: [{ slug: "main" }],
    });

    const mediaList = await server.inject({
      method: "GET",
      url: "/api/v1/media/assets?visibility=public",
      headers: requestHeaders("exp-media-list"),
    });
    expect(mediaList.statusCode).toBe(200);
    expect(
      parseBody<{ total: number; items: Array<{ file_key: string }> }>(mediaList),
    ).toMatchObject({
      total: 1,
      items: [{ file_key: "catalog/demo-bus.jpg" }],
    });

    const signedUrl = await server.inject({
      method: "GET",
      url: "/api/v1/media/assets/1/signed-url",
      headers: requestHeaders("exp-media-signed"),
    });
    expect(signedUrl.statusCode).toBe(200);
    expect(
      parseBody<{ item: { url: string; method: string } }>(signedUrl),
    ).toMatchObject({
      item: {
        method: "GET",
      },
    });
    expect(parseBody<{ item: { url: string } }>(signedUrl).item.url).toContain(
      "demo-bus.jpg",
    );

    const search = await server.inject({
      method: "GET",
      url: "/api/v1/search?q=demo&market=global&locale=en-US",
      headers: requestHeaders("exp-search"),
    });
    expect(search.statusCode).toBe(200);
    expect(parseBody<{ total: number }>(search).total).toBe(2);

    const metadata = await server.inject({
      method: "GET",
      url: "/api/v1/seo/metadata?path=/products/demo-bus&market=global&locale=en-US",
      headers: requestHeaders("exp-seo-metadata"),
    });
    expect(metadata.statusCode).toBe(200);
    expect(
      parseBody<{ title: string; canonical_url?: string; indexable: boolean }>(metadata),
    ).toMatchObject({
      title: "Demo Bus",
      canonical_url: "https://www.wemovetoy.com/products/demo-bus",
      indexable: true,
    });

    const sitemap = await server.inject({
      method: "GET",
      url: "/api/v1/seo/sitemap",
      headers: requestHeaders("exp-seo-sitemap"),
    });
    expect(sitemap.statusCode).toBe(200);
    expect(
      parseBody<{ item: { entries: Array<{ url: string }> } }>(sitemap),
    ).toMatchObject({
      item: {
        entries: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining("/products/demo-bus"),
          }),
          expect.objectContaining({
            url: expect.stringContaining("/pages/home"),
          }),
        ]),
      },
    });

    const localization = await server.inject({
      method: "GET",
      url: "/api/v1/localization/snapshot",
      headers: requestHeaders("exp-localization"),
    });
    expect(localization.statusCode).toBe(200);
    expect(
      parseBody<{ item: { markets: Array<{ code: string }>; routes: Array<{ prefix: string }> } }>(localization),
    ).toMatchObject({
      item: {
        markets: expect.arrayContaining([
          expect.objectContaining({ code: "global" }),
        ]),
        routes: expect.arrayContaining([
          expect.objectContaining({ prefix: "/" }),
        ]),
      },
    });
  });

  it("deduplicates form submissions and notification deliveries", async () => {
    const server = state.server!;
    const requestId = "forms-001";
    const payload = {
      type: "contact",
      source: "public-site",
      payload: {
        name: "Buyer",
        email: "buyer@example.com",
        message: "Please call back",
      },
      attachments: [1],
      priority: "high",
      tags: ["sales"],
    };

    const first = await server.inject({
      method: "POST",
      url: "/api/v1/forms/submissions",
      headers: requestHeaders(requestId),
      payload,
    });
    const second = await server.inject({
      method: "POST",
      url: "/api/v1/forms/submissions",
      headers: requestHeaders(requestId),
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstBody = parseBody<{ item: { id: number; status: string } }>(first);
    const secondBody = parseBody<{ item: { id: number; status: string } }>(second);
    expect(secondBody.item.id).toBe(firstBody.item.id);
    expect(firstBody.item.status).toBe("new");

    const staff = staffHeaders("forms-admin", 1);

    const submissions = await server.inject({
      method: "GET",
      url: "/api/v1/admin/forms/submissions?type=contact",
      headers: staff,
    });
    expect(submissions.statusCode).toBe(200);
    expect(parseBody<{ total: number }>(submissions).total).toBe(1);

    const update = await server.inject({
      method: "PATCH",
      url: `/api/v1/admin/forms/submissions/${firstBody.item.id}`,
      headers: staffHeaders("forms-update", 1),
      payload: {
        status: "in_review",
        internal_note: "Assigned to sales",
        tags: ["sales", "vip"],
      },
    });
    expect(update.statusCode).toBe(200);
    expect(
      parseBody<{ item: { status: string; history: Array<{ status: string }> } }>(update),
    ).toMatchObject({
      item: {
        status: "in_review",
        history: [
          {
            status: "new",
          },
          {
            status: "in_review",
          },
        ],
      },
    });

    const deliveries = await server.inject({
      method: "GET",
      url: `/api/v1/admin/notifications/deliveries?request_id=${requestId}`,
      headers: staffHeaders("forms-deliveries", 1),
    });
    expect(deliveries.statusCode).toBe(200);
    expect(
      parseBody<{ total: number; items: Array<{ template_code: string; audience: string }> }>(deliveries),
    ).toMatchObject({
      total: 1,
      items: [
        {
          template_code: "form_received",
          audience: "staff",
        },
      ],
    });
  });

  it("keeps inventory and order mutations idempotent and enforces owner checks", async () => {
    const server = state.server!;

    const balanceBefore = parseBody<{ items: Array<{ variant_id: number; available: number; reserved: number }> }>(
      await server.inject({
        method: "GET",
        url: "/api/v1/inventory/balances?variant_id=2&market=global",
        headers: requestHeaders("inventory-before"),
      }),
    );
    expect(findBalance(balanceBefore, 2)).toMatchObject({
      available: 120,
      reserved: 0,
    });

    const confirmReservation = await server.inject({
      method: "POST",
      url: "/api/v1/inventory/reservations",
      headers: requestHeaders("inventory-reserve-2"),
      payload: {
        variant_id: 2,
        quantity: 1,
        owner_type: "manual",
        owner_id: 88,
        warehouse_code: "WH-US-1",
        market: "global",
        idempotency_key: "reserve-variant-2",
        expires_at: null,
      },
    });
    const confirmReservationRepeat = await server.inject({
      method: "POST",
      url: "/api/v1/inventory/reservations",
      headers: requestHeaders("inventory-reserve-2"),
      payload: {
        variant_id: 2,
        quantity: 1,
        owner_type: "manual",
        owner_id: 88,
        warehouse_code: "WH-US-1",
        market: "global",
        idempotency_key: "reserve-variant-2",
        expires_at: null,
      },
    });

    expect(confirmReservation.statusCode).toBe(200);
    expect(confirmReservationRepeat.statusCode).toBe(200);
    const confirmReservationBody = parseBody<{ item: { id: number; status: string } }>(confirmReservation);
    expect(
      parseBody<{ item: { id: number; status: string } }>(confirmReservationRepeat).item.id,
    ).toBe(confirmReservationBody.item.id);

    const confirmed = await server.inject({
      method: "POST",
      url: `/api/v1/inventory/reservations/${confirmReservationBody.item.id}/confirm`,
      headers: staffHeaders("inventory-confirm-2", 1),
      payload: {},
    });
    expect(confirmed.statusCode).toBe(200);
    expect(parseBody<{ item: { status: string } }>(confirmed)).toMatchObject({
      item: {
        status: "confirmed",
      },
    });

    const balanceAfterConfirm = parseBody<{ items: Array<{ variant_id: number; available: number; reserved: number }> }>(
      await server.inject({
        method: "GET",
        url: "/api/v1/inventory/balances?variant_id=2&market=global",
        headers: requestHeaders("inventory-after-confirm"),
      }),
    );
    expect(findBalance(balanceAfterConfirm, 2)).toMatchObject({
      available: 119,
      reserved: 0,
    });

    const releasedReservation = await server.inject({
      method: "POST",
      url: "/api/v1/inventory/reservations",
      headers: requestHeaders("inventory-reserve-4"),
      payload: {
        variant_id: 4,
        quantity: 2,
        owner_type: "manual",
        owner_id: 89,
        warehouse_code: "WH-US-1",
        market: "global",
        idempotency_key: "reserve-variant-4",
        expires_at: null,
      },
    });
    const releasedReservationBody = parseBody<{ item: { id: number; status: string } }>(releasedReservation);
    const released = await server.inject({
      method: "POST",
      url: `/api/v1/inventory/reservations/${releasedReservationBody.item.id}/release`,
      headers: staffHeaders("inventory-release-4", 1),
      payload: {
        reason: "cleanup",
      },
    });
    expect(released.statusCode).toBe(200);
    expect(parseBody<{ item: { status: string } }>(released)).toMatchObject({
      item: {
        status: "released",
      },
    });

    const balanceAfterRelease = parseBody<{ items: Array<{ variant_id: number; available: number; reserved: number }> }>(
      await server.inject({
        method: "GET",
        url: "/api/v1/inventory/balances?variant_id=4&market=global",
        headers: requestHeaders("inventory-after-release"),
      }),
    );
    expect(findBalance(balanceAfterRelease, 4)).toMatchObject({
      available: 80,
      reserved: 0,
    });

    const orderHeaders = staffHeaders("order-b2b-001", 1);
    const orderBody = {
      channel: "b2b",
      items: [{ variant_id: 4, quantity: 2 }],
      address_snapshot: { city: "Shanghai" },
      note: "PO-001",
    };
    const order = await server.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: orderHeaders,
      payload: orderBody,
    });
    const orderRepeat = await server.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: orderHeaders,
      payload: orderBody,
    });
    expect(order.statusCode).toBe(200);
    expect(orderRepeat.statusCode).toBe(200);
    const orderBodyResult = parseBody<{ item: { id: number; status: string; company_id: number | null; subtotal_minor: number; pricing_snapshot: { source: string } } }>(order);
    expect(parseBody<{ item: { id: number } }>(orderRepeat).item.id).toBe(
      orderBodyResult.item.id,
    );
    expect(orderBodyResult.item).toMatchObject({
      status: "pending_review",
      company_id: 1,
      subtotal_minor: 5798,
      pricing_snapshot: {
        source: "dealer_company",
      },
    });

    const orderReservations = await server.inject({
      method: "GET",
      url: `/api/v1/admin/inventory/reservations?owner_type=order&owner_id=${orderBodyResult.item.id}`,
      headers: staffHeaders("inventory-order-list", 1),
    });
    expect(orderReservations.statusCode).toBe(200);
    expect(parseBody<{ total: number }>(orderReservations).total).toBe(1);

    const forbiddenUpdate = await server.inject({
      method: "PATCH",
      url: `/api/v1/orders/${orderBodyResult.item.id}/status`,
      headers: dealerHeaders("order-forbidden-001", 2),
      payload: {
        status: "completed",
        note: "not allowed",
      },
    });
    expect(forbiddenUpdate.statusCode).toBe(403);
    expect(parseBody<{ code: string; request_id: string }>(forbiddenUpdate)).toMatchObject({
      code: "FORBIDDEN",
      request_id: "order-forbidden-001",
    });

    const orderAfterForbidden = await server.inject({
      method: "GET",
      url: `/api/v1/orders/${orderBodyResult.item.id}`,
      headers: staffHeaders("order-after-forbidden", 1),
    });
    expect(parseBody<{ item: { status: string } }>(orderAfterForbidden)).toMatchObject({
      item: {
        status: "pending_review",
      },
    });
  });

  it("completes payment, return, and quote lifecycles", async () => {
    const server = state.server!;

    const order = await server.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: requestHeaders("order-b2c-001"),
      payload: {
        channel: "b2c",
        items: [{ variant_id: 2, quantity: 2 }],
        address_snapshot: { city: "Beijing" },
        note: "web checkout",
      },
    });
    expect(order.statusCode).toBe(200);
    const orderBody = parseBody<{ item: { id: number; status: string; subtotal_minor: number } }>(order);
    expect(orderBody.item).toMatchObject({
      status: "pending_payment",
      subtotal_minor: 7998,
    });

    const payment = await server.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: requestHeaders("payment-001"),
      payload: {
        order_id: orderBody.item.id,
        provider: "stripe",
        idempotency_key: "pay-001",
        payload: {
          source: "checkout",
        },
      },
    });
    const paymentRepeat = await server.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: requestHeaders("payment-001"),
      payload: {
        order_id: orderBody.item.id,
        provider: "stripe",
        idempotency_key: "pay-001",
        payload: {
          source: "checkout",
        },
      },
    });
    expect(payment.statusCode).toBe(200);
    expect(paymentRepeat.statusCode).toBe(200);
    const paymentBody = parseBody<{ item: { id: number; status: string; amount_minor: number } }>(payment);
    expect(parseBody<{ item: { id: number } }>(paymentRepeat).item.id).toBe(
      paymentBody.item.id,
    );
    expect(paymentBody.item).toMatchObject({
      status: "pending",
      amount_minor: 7998,
    });

    const captured = await server.inject({
      method: "POST",
      url: `/api/v1/payments/${paymentBody.item.id}/capture`,
      headers: staffHeaders("payment-capture-001", 1),
      payload: {
        provider_txn_id: "txn-001",
        amount_minor: 7998,
        payload: {
          settled: true,
        },
      },
    });
    expect(captured.statusCode).toBe(200);
    expect(parseBody<{ item: { status: string } }>(captured)).toMatchObject({
      item: {
        status: "paid",
      },
    });

    const paidOrder = await server.inject({
      method: "GET",
      url: `/api/v1/orders/${orderBody.item.id}`,
      headers: staffHeaders("order-paid-001", 1),
    });
    expect(parseBody<{ item: { status: string } }>(paidOrder)).toMatchObject({
      item: {
        status: "paid",
      },
    });

    const returnRequest = {
      order_id: orderBody.item.id,
      reason: "Damaged box",
      items: [
        {
          variant_id: 2,
          quantity: 1,
          reason: "box damage",
          snapshot: {
            sku: "BUS-001",
          },
        },
      ],
      attachments: [1],
    };
    const returnCreated = await server.inject({
      method: "POST",
      url: "/api/v1/returns",
      headers: staffHeaders("return-001", 1),
      payload: returnRequest,
    });
    const returnRepeat = await server.inject({
      method: "POST",
      url: "/api/v1/returns",
      headers: staffHeaders("return-001", 1),
      payload: returnRequest,
    });
    expect(returnCreated.statusCode).toBe(200);
    expect(returnRepeat.statusCode).toBe(200);
    const returnBody = parseBody<{ item: { id: number; status: string } }>(returnCreated);
    expect(parseBody<{ item: { id: number } }>(returnRepeat).item.id).toBe(
      returnBody.item.id,
    );
    expect(returnBody.item.status).toBe("requested");

    const approved = await server.inject({
      method: "POST",
      url: `/api/v1/admin/returns/${returnBody.item.id}/review`,
      headers: staffHeaders("return-review-001", 1),
      payload: {
        decision: "approved",
        note: "Accepted",
      },
    });
    expect(parseBody<{ item: { status: string } }>(approved)).toMatchObject({
      item: {
        status: "approved",
      },
    });

    const refundedReturn = await server.inject({
      method: "POST",
      url: `/api/v1/admin/returns/${returnBody.item.id}/review`,
      headers: staffHeaders("return-review-002", 1),
      payload: {
        decision: "refunded",
        note: "Refund issued",
      },
    });
    expect(parseBody<{ item: { status: string } }>(refundedReturn)).toMatchObject({
      item: {
        status: "refunded",
      },
    });

    const refundedPayment = await server.inject({
      method: "POST",
      url: `/api/v1/payments/${paymentBody.item.id}/refund`,
      headers: staffHeaders("payment-refund-001", 1),
      payload: {
        amount_minor: 7998,
        reason: "Customer return",
      },
    });
    expect(parseBody<{ item: { status: string } }>(refundedPayment)).toMatchObject({
      item: {
        status: "refunded",
      },
    });

    const refundedOrder = await server.inject({
      method: "GET",
      url: `/api/v1/orders/${orderBody.item.id}`,
      headers: staffHeaders("order-refunded-001", 1),
    });
    expect(parseBody<{ item: { status: string } }>(refundedOrder)).toMatchObject({
      item: {
        status: "refunded",
      },
    });
  });

  it("tracks quote creation, review, conversion, and idempotent retries", async () => {
    const server = state.server!;

    const quoteRequest = {
      company_id: 1,
      items: [{ variant_id: 4, quantity: 1 }],
      pricing_snapshot: {
        source: "dealer_company",
      },
      terms_snapshot: {
        payment_terms: "Net 30",
      },
      valid_days: 7,
    };
    const created = await server.inject({
      method: "POST",
      url: "/api/v1/quotes",
      headers: staffHeaders("quote-001", 1),
      payload: quoteRequest,
    });
    const createdRepeat = await server.inject({
      method: "POST",
      url: "/api/v1/quotes",
      headers: staffHeaders("quote-001", 1),
      payload: quoteRequest,
    });
    expect(created.statusCode).toBe(200);
    expect(createdRepeat.statusCode).toBe(200);
    const quoteBody = parseBody<{ item: { id: number; status: string; current_version: number } }>(created);
    expect(parseBody<{ item: { id: number } }>(createdRepeat).item.id).toBe(
      quoteBody.item.id,
    );
    expect(quoteBody.item).toMatchObject({
      status: "requested",
      current_version: 1,
    });

    const reviewed = await server.inject({
      method: "POST",
      url: `/api/v1/quotes/${quoteBody.item.id}/review`,
      headers: staffHeaders("quote-review-001", 1),
      payload: {
        decision: "quoted",
        note: "Approved",
        terms_snapshot: {
          payment_terms: "Net 30",
          freight: "FOB",
        },
      },
    });
    expect(parseBody<{ item: { status: string; current_version: number } }>(reviewed)).toMatchObject({
      item: {
        status: "quoted",
        current_version: 2,
      },
    });

    const converted = await server.inject({
      method: "POST",
      url: `/api/v1/quotes/${quoteBody.item.id}/convert`,
      headers: staffHeaders("quote-convert-001", 1),
      payload: {
        order_channel: "b2b",
        accepted_version: 2,
        note: "Convert now",
      },
    });
    const convertedRepeat = await server.inject({
      method: "POST",
      url: `/api/v1/quotes/${quoteBody.item.id}/convert`,
      headers: staffHeaders("quote-convert-001", 1),
      payload: {
        order_channel: "b2b",
        accepted_version: 2,
        note: "Convert now",
      },
    });
    expect(converted.statusCode).toBe(200);
    expect(convertedRepeat.statusCode).toBe(200);
    const convertedBody = parseBody<{ item: { status: string; converted_order_id: number | null } }>(converted);
    expect(parseBody<{ item: { converted_order_id: number | null } }>(convertedRepeat).item.converted_order_id).toBe(
      convertedBody.item.converted_order_id,
    );
    expect(convertedBody.item).toMatchObject({
      status: "converted",
    });
    expect(convertedBody.item.converted_order_id).toBeGreaterThan(0);

    const versions = await server.inject({
      method: "GET",
      url: `/api/v1/quotes/${quoteBody.item.id}/versions`,
      headers: staffHeaders("quote-versions-001", 1),
    });
    expect(parseBody<{ total: number }>(versions).total).toBe(2);
  });
});
