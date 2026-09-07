import { describe, expect, it } from "vitest";
import {
  CartMutationResponseSchema,
  OrderMutationResponseSchema,
} from "../packages/contracts/src";

import {
  createMockCartResponse,
  handleMockRequest,
  startMockServer,
} from "./storefront-contract-mock";

const guestCheckout = {
  items: [{ variant_id: 1001, quantity: 1 }],
  contact: { name: "Alex", email: "alex@example.com" },
  shipping_address: {
    line1: "1 Main Street",
    city: "London",
    country: "GB",
  },
};

describe("storefront contract mock handler", () => {
  it("returns a contract-valid cart fixture", () => {
    const response = createMockCartResponse("mock-cart-1");
    const cart = CartMutationResponseSchema.parse(response.body).item;

    expect(response.status).toBe(200);
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]?.variant_id).toBe(1001);
  });

  it("calculates checkout totals from server-owned fixture prices", () => {
    const response = handleMockRequest(
      "POST",
      "/api/v1/checkout",
      { ...guestCheckout, items: [{ variant_id: 1001, quantity: 2 }] },
      "mock-checkout-1",
    );
    const order = OrderMutationResponseSchema.parse(response.body).item;

    expect(response.status).toBe(200);
    expect(order.total_minor).toBe(6400);
    expect(order.items[0]?.unit_price_minor).toBe(3200);
    expect(order.items[0]?.total_minor).toBe(6400);
  });

  it("rejects unknown variants with an API error and no order", () => {
    const response = handleMockRequest(
      "POST",
      "/api/v1/checkout",
      { ...guestCheckout, items: [{ variant_id: 9999, quantity: 1 }] },
      "mock-checkout-2",
    );

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      request_id: "mock-checkout-2",
      field_errors: [],
    });
  });

  it("rejects client-supplied price fields through the strict contract", () => {
    const response = handleMockRequest(
      "POST",
      "/api/v1/checkout",
      {
        ...guestCheckout,
        items: [{ variant_id: 1001, quantity: 1, unit_price_minor: 1 }],
      },
      "mock-checkout-3",
    );

    expect(response.status).toBe(400);
  });

  it("serves contract responses over HTTP on a loopback port", async () => {
    const server = await startMockServer(0);
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Mock server did not expose a TCP address.");
    }

    try {
      const cartResponse = await fetch(`http://127.0.0.1:${address.port}/api/v1/cart`);
      const cartBody = await cartResponse.json();
      const checkoutResponse = await fetch(`http://127.0.0.1:${address.port}/api/v1/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestCheckout),
      });
      const checkoutBody = await checkoutResponse.json();

      expect(cartResponse.status).toBe(200);
      expect(cartResponse.headers.get("x-wemo-environment")).toBe("contract-mock");
      expect(CartMutationResponseSchema.parse(cartBody).item.id).toBe(501);
      expect(checkoutResponse.status).toBe(200);
      expect(OrderMutationResponseSchema.parse(checkoutBody).item.channel).toBe("b2c");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
