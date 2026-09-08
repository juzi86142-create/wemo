import type { Cart } from "@wemo/contracts";

import type { CheckoutFormValues } from "./checkout-validation";

export type CheckoutPaymentSelection = {
  method: "" | "card" | "bank_transfer" | "invoice_po";
  billingName?: string;
  billingAddress?: string;
  purchaseOrder?: string;
};

export function buildCheckoutInput(cart: Cart, values: CheckoutFormValues, payment: CheckoutPaymentSelection) {
  const noteParts = [values.note.trim()];
  if (payment.method === "invoice_po" && payment.purchaseOrder?.trim()) {
    noteParts.push(`Purchase order: ${payment.purchaseOrder.trim()}`);
  }

  return {
    items: cart.items.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity })),
    contact: {
      name: values.name.trim(),
      email: values.email.trim(),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
    },
    shipping_address: {
      line1: values.addressLine1.trim(),
      ...(values.addressLine2.trim() ? { line2: values.addressLine2.trim() } : {}),
      city: values.city.trim(),
      ...(values.region.trim() ? { region: values.region.trim() } : {}),
      postal_code: values.postalCode.trim(),
      country: values.country.trim(),
    },
    payment_method: payment.method,
    ...(payment.method === "card" ? { billing_address: { name: payment.billingName?.trim(), line1: payment.billingAddress?.trim() } } : {}),
    ...(values.couponCode.trim() ? { coupon_code: values.couponCode.trim() } : {}),
    ...(noteParts.filter(Boolean).length > 0 ? { note: noteParts.filter(Boolean).join("\n") } : {}),
  };
}
