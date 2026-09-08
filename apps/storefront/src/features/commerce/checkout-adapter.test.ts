import { describe, expect, it } from "vitest";

import { createCheckout } from "./checkout-adapter";
import { getPreviewCart } from "./cart-adapter";

describe("createCheckout", () => {
  it("creates a contract-valid local demo order", async () => {
    const order = await createCheckout({
        items: [{ variant_id: 1001, quantity: 2 }],
        contact: { name: "Alex", email: "alex@example.com" },
        shipping_address: {
          line1: "1 Main Street",
          city: "London",
          country: "GB",
        },
      });

    expect(order).toMatchObject({
      channel: "b2c",
      status: "pending_payment",
      subtotal_minor: 6400,
      total_minor: 6400,
      items: [{ variant_id: 1001, quantity: 2, unit_price_minor: 3200 }],
    });
  });

  it("uses the current cart snapshot for checkout names and prices", async () => {
    const sourceCart = {
      ...getPreviewCart(),
      items: [
        {
          ...getPreviewCart().items[0]!,
          quantity: 2,
          unit_price_minor: 3500,
          line_total_minor: 7000,
          snapshot: { name: "Cart-linked bowling set" },
        },
      ],
      subtotal_minor: 7000,
      total_minor: 7000,
    };
    const order = await createCheckout(
      {
        items: [{ variant_id: 1001, quantity: 2 }],
        contact: { name: "Alex", email: "alex@example.com" },
        shipping_address: { line1: "1 Main Street", city: "London", country: "GB" },
      },
      sourceCart,
    );

    expect(order).toMatchObject({
      subtotal_minor: 7000,
      total_minor: 7000,
      items: [{ name_snapshot: "Cart-linked bowling set", unit_price_minor: 3500, total_minor: 7000 }],
    });
  });

  it("still validates demo checkout input", async () => {
    await expect(
      createCheckout({
        items: [],
        contact: { name: "Alex", email: "alex@example.com" },
        shipping_address: { line1: "1 Main Street", city: "London", country: "GB" },
      }),
    ).rejects.toThrow();
  });
});
