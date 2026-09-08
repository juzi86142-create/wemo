import {
  CheckoutCreateSchema,
  OrderMutationResponseSchema,
  type CheckoutCreateInput,
  type Cart,
  type Order,
} from "@wemo/contracts";

const demoVariants: Record<number, { sku: string; name: string; priceMinor: number }> = {
  1001: { sku: "WEMO-RPB-01", name: "Roll & Play Bowling Set", priceMinor: 3200 },
  1002: { sku: "WEMO-SBB-01", name: "Steady Balance Board", priceMinor: 4400 },
  1003: { sku: "WEMO-OTT-01", name: "Orbit Target Toss", priceMinor: 3800 },
};

export async function createCheckout(input: CheckoutCreateInput, sourceCart?: Cart): Promise<Order> {
  const parsed = CheckoutCreateSchema.parse(input);
  const createdAt = new Date().toISOString();
  const requestId = `demo-checkout-${Date.now()}`;
  const items = parsed.items.map((line, index) => {
    const cartItem = sourceCart?.items.find((item) => item.variant_id === line.variant_id);
    const demoVariant = demoVariants[line.variant_id];
    const snapshot = cartItem?.snapshot;
    const snapshotName = typeof snapshot === "object" && snapshot !== null && !Array.isArray(snapshot)
      ? (snapshot as { name?: unknown }).name
      : undefined;
    const variant = {
      sku: demoVariant?.sku ?? `DEMO-${line.variant_id}`,
      name: typeof snapshotName === "string" ? snapshotName : demoVariant?.name ?? "WEMOVE demo product",
      priceMinor: cartItem?.unit_price_minor ?? demoVariant?.priceMinor ?? 3200,
    };
    return {
      id: 9100 + index,
      variant_id: line.variant_id,
      sku_snapshot: variant.sku,
      name_snapshot: variant.name,
      quantity: line.quantity,
      unit_price_minor: variant.priceMinor,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: variant.priceMinor * line.quantity,
      detail_snapshot: { source: "frontend-demo" },
    };
  });
  const subtotal = items.reduce((total, item) => total + item.total_minor, 0);
  const response = OrderMutationResponseSchema.parse(
    {
      request_id: requestId,
      item: {
        id: Date.now(),
        order_no: `DEMO-${Date.now().toString().slice(-8)}`,
        channel: "b2c",
        user_id: null,
        company_id: null,
        currency: "USD",
        subtotal_minor: subtotal,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: subtotal,
        status: "pending_payment",
        address_snapshot: parsed.shipping_address,
        pricing_snapshot: {
          source: "frontend-demo",
          contact: parsed.contact,
          billing_address: parsed.billing_address ?? parsed.shipping_address,
          coupon_code: parsed.coupon_code ?? null,
          payment_method: parsed.payment_method ?? null,
        },
        items,
        status_history: [
          {
            status: "pending_payment",
            request_id: requestId,
            note: "Frontend demonstration order",
            created_at: createdAt,
          },
        ],
        created_at: createdAt,
        updated_at: createdAt,
      },
    },
  );
  return response.item;
}
