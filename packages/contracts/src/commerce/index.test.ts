import { describe, expect, it } from "vitest";

import {
  CartSchema,
  InventoryReservationCreateSchema,
  OrderSchema,
  OrderStatusSchema,
  PaymentSchema,
  PricingPreviewRequestSchema,
  QuoteSchema,
  ReturnCreateSchema,
  ReturnRequestSchema,
  ReturnStatusSchema,
} from "./index.js";

const timestamp = "2026-09-05T00:00:00.000Z";

const lineItem = {
  id: 1,
  variant_id: 4,
  sku_snapshot: "RACER-001",
  name_snapshot: "Demo Racer",
  quantity: 2,
  unit_price_minor: 2899,
  tax_minor: 0,
  shipping_minor: 0,
  total_minor: 5798,
  detail_snapshot: {
    sku: "RACER-001",
  },
};

describe("commerce contracts", () => {
  it("parses pricing, cart, order, and quote payloads", () => {
    expect(
      PricingPreviewRequestSchema.parse({
        items: [{ variant_id: 4, quantity: 2 }],
        market: "global",
        currency: "USD",
        dealer_company_id: 1,
      }),
    ).toMatchObject({
      items: [{ variant_id: 4, quantity: 2 }],
      dealer_company_id: 1,
    });

    expect(
      CartSchema.parse({
        id: 1,
        user_id: null,
        company_id: null,
        channel: "guest",
        market: "global",
        currency: "USD",
        status: "active",
        items: [
          {
            id: 1,
            variant_id: 2,
            quantity: 2,
            unit_price_minor: 3999,
            line_total_minor: 7998,
            currency: "USD",
            snapshot: { variant_id: 2 },
            added_at: timestamp,
            updated_at: timestamp,
          },
        ],
        subtotal_minor: 7998,
        total_minor: 7998,
        updated_at: timestamp,
        expires_at: null,
        created_at: timestamp,
      }),
    ).toMatchObject({
      channel: "guest",
      total_minor: 7998,
    });

    expect(
      OrderSchema.parse({
        id: 1,
        order_no: "SO-000001",
        channel: "b2b",
        user_id: null,
        company_id: 1,
        currency: "USD",
        subtotal_minor: 5798,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 5798,
        status: "pending_review",
        address_snapshot: { city: "Shanghai" },
        pricing_snapshot: { source: "dealer_company" },
        items: [lineItem],
        status_history: [
          {
            status: "pending_review",
            request_id: "req_order_001",
            note: "seed",
            created_at: timestamp,
          },
        ],
        created_at: timestamp,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      status: "pending_review",
      items: [expect.objectContaining({ total_minor: 5798 })],
    });

    expect(
      QuoteSchema.parse({
        id: 1,
        quote_no: "Q-000001",
        company_id: 1,
        requested_by_user_id: 7,
        current_version: 2,
        status: "quoted",
        valid_until: timestamp,
        converted_order_id: null,
        pricing_snapshot: { source: "dealer_company" },
        terms_snapshot: { payment_terms: "Net 30" },
        items: [{ variant_id: 4, quantity: 1 }],
        versions: [
          {
            id: 1,
            quote_id: 1,
            version: 1,
            snapshot: {
              items: [{ variant_id: 4, quantity: 1 }],
              pricing_snapshot: { source: "dealer_company" },
              terms_snapshot: { payment_terms: "Net 30" },
              status: "requested",
              valid_until: timestamp,
            },
            created_by: 7,
            created_at: timestamp,
          },
        ],
        created_at: timestamp,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      status: "quoted",
      versions: [{ version: 1 }],
    });
  });

  it("parses inventory, payment, and return payloads and rejects invalid states", () => {
    expect(
      InventoryReservationCreateSchema.parse({
        variant_id: 4,
        quantity: 2,
        owner_type: "order",
        owner_id: 1,
        warehouse_code: "WH-US-1",
        market: "global",
        idempotency_key: "reserve-001",
        expires_at: null,
      }),
    ).toMatchObject({
      owner_type: "order",
      idempotency_key: "reserve-001",
    });

    expect(
      PaymentSchema.parse({
        id: 1,
        order_id: 1,
        provider: "stripe",
        provider_txn_id: null,
        status: "pending",
        amount_minor: 5798,
        currency: "USD",
        failure_reason: null,
        idempotency_key: "pay-001",
        refunded_minor: 0,
        payload: { order_no: "SO-000001" },
        created_at: timestamp,
        updated_at: timestamp,
      }),
    ).toMatchObject({
      status: "pending",
      amount_minor: 5798,
    });

    expect(
      ReturnCreateSchema.parse({
        order_id: 1,
        reason: "Damaged box",
        items: [
          {
            variant_id: 4,
            quantity: 1,
            reason: "box damage",
            snapshot: { sku: "RACER-001" },
          },
        ],
        attachments: [1],
      }),
    ).toMatchObject({
      order_id: 1,
      attachments: [1],
    });

    expect(
      ReturnRequestSchema.parse({
        id: 1,
        order_id: 1,
        user_id: null,
        company_id: 1,
        status: "approved",
        reason: "Damaged box",
        items: [
          {
            variant_id: 4,
            quantity: 1,
            reason: "box damage",
            snapshot: { sku: "RACER-001" },
          },
        ],
        attachments: [1],
        history: [
          {
            status: "requested",
            note: null,
            request_id: "req_return_001",
            created_at: timestamp,
          },
          {
            status: "approved",
            note: "Accepted",
            request_id: "req_return_002",
            created_at: timestamp,
          },
        ],
        created_at: timestamp,
        updated_at: timestamp,
        refunded_at: null,
      }),
    ).toMatchObject({
      status: "approved",
    });

    expect(OrderStatusSchema.safeParse("draft").success).toBe(false);
    expect(ReturnStatusSchema.safeParse("withdrawn").success).toBe(false);
  });
});
