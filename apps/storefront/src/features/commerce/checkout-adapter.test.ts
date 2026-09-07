import { describe, expect, it, vi } from "vitest";
import type { Order } from "@wemo/contracts";

import { ApiError, requestJson } from "../platform/api-client";
import { createCheckout } from "./checkout-adapter";

vi.mock("../platform/api-client", async () => {
  const actual = await vi.importActual<typeof import("../platform/api-client")>(
    "../platform/api-client",
  );
  return { ...actual, requestJson: vi.fn() };
});

const requestJsonMock = vi.mocked(requestJson);

const order: Order = {
  id: 901,
  order_no: "WEMO-20260908-0001",
  channel: "b2c",
  user_id: null,
  company_id: null,
  currency: "USD",
  subtotal_minor: 6400,
  tax_minor: 0,
  shipping_minor: 0,
  total_minor: 6400,
  status: "pending_payment",
  address_snapshot: { contact: { name: "Alex", email: "alex@example.com" } },
  pricing_snapshot: { source: "default" },
  items: [
    {
      id: 1,
      variant_id: 1001,
      sku_snapshot: "WEMO-1001",
      name_snapshot: "Roll & Play Bowling Set",
      quantity: 2,
      unit_price_minor: 3200,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 6400,
      detail_snapshot: {},
    },
  ],
  status_history: [],
  created_at: "2026-09-08T00:00:00.000Z",
  updated_at: "2026-09-08T00:00:00.000Z",
};

describe("createCheckout", () => {
  it("posts only variant ids and quantities and returns the validated order", async () => {
    requestJsonMock.mockResolvedValue({ request_id: "req-1", item: order });

    await expect(
      createCheckout({
        items: [{ variant_id: 1001, quantity: 2 }],
        contact: { name: "Alex", email: "alex@example.com" },
        shipping_address: {
          line1: "1 Main Street",
          city: "London",
          country: "GB",
        },
      }),
    ).resolves.toEqual(order);

    expect(requestJsonMock).toHaveBeenCalledWith("/checkout", {
      method: "POST",
      body: expect.stringContaining('"variant_id":1001'),
    });
    const [, init] = requestJsonMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("total_minor");
  });

  it("propagates API errors with their request id", async () => {
    requestJsonMock.mockRejectedValue(new ApiError("Out of stock", 403, "req-2"));

    await expect(
      createCheckout({
        items: [{ variant_id: 1001, quantity: 1 }],
        contact: { name: "Alex", email: "alex@example.com" },
        shipping_address: { line1: "1 Main Street", city: "London", country: "GB" },
      }),
    ).rejects.toMatchObject({ status: 403, requestId: "req-2" });
  });
});
