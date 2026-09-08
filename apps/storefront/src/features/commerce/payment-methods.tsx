"use client";

import { createElement } from "react";

export type PaymentMethod = "" | "card" | "bank_transfer" | "invoice_po";

export interface PaymentSelection {
  method: PaymentMethod;
  billingName?: string;
  billingAddress?: string;
  purchaseOrder?: string;
}

export function validatePaymentSelection(selection: PaymentSelection) {
  const errors: Record<string, string> = {};

  if (!selection.method) errors.method = "Choose a payment method.";
  if (selection.method === "card" && !selection.billingName?.trim()) errors.billingName = "Enter the billing name.";
  if (selection.method === "card" && !selection.billingAddress?.trim()) errors.billingAddress = "Enter the billing address.";
  if (selection.method === "invoice_po" && !selection.purchaseOrder?.trim()) errors.purchaseOrder = "Enter a PO number.";

  return errors;
}

const methods: Array<{ value: Exclude<PaymentMethod, "">; title: string; description: string }> = [
  { value: "card", title: "Card", description: "Card details are collected by the secure payment provider after checkout is connected." },
  { value: "bank_transfer", title: "Bank transfer", description: "Bank instructions are issued after the live order is confirmed." },
  { value: "invoice_po", title: "Invoice / PO", description: "Provide a purchase-order reference for your invoice workflow." },
];

export function PaymentMethods({ selection, errors, onChange }: {
  selection: PaymentSelection;
  errors: Record<string, string>;
  onChange: (selection: PaymentSelection) => void;
}) {
  function update(values: Partial<PaymentSelection>) {
    onChange({ ...selection, ...values });
  }

  return createElement(
    "fieldset",
    { className: "checkout-section payment-methods", "aria-describedby": errors.method ? "payment-method-error" : undefined },
    createElement("legend", null, "Payment method"),
    createElement("p", { className: "payment-method-note" }, "Choose how you want to pay. Payment confirmation remains with the live service."),
    createElement("div", { className: "payment-method-list" }, methods.map((method) => createElement(
      "label",
      { className: selection.method === method.value ? "payment-method is-selected" : "payment-method", key: method.value },
      createElement("input", { type: "radio", name: "payment-method", value: method.value, checked: selection.method === method.value, onChange: () => update({ method: method.value }) }),
      createElement("span", null, createElement("strong", null, method.title), createElement("small", null, method.description)),
    ))),
    selection.method === "card" ? createElement("div", { className: "checkout-field-grid payment-billing-fields" }, createElement(PaymentField, { id: "billing-name", label: "Billing name", value: selection.billingName ?? "", error: errors.billingName, onChange: (billingName: string) => update({ billingName }) }), createElement(PaymentField, { id: "billing-address", label: "Billing address", value: selection.billingAddress ?? "", error: errors.billingAddress, onChange: (billingAddress: string) => update({ billingAddress }) })) : null,
    selection.method === "invoice_po" ? createElement(PaymentField, { id: "purchase-order", label: "Purchase order number", value: selection.purchaseOrder ?? "", error: errors.purchaseOrder, onChange: (purchaseOrder: string) => update({ purchaseOrder }) }) : null,
    errors.method ? createElement("p", { className: "field-error", id: "payment-method-error", role: "alert" }, errors.method) : null,
  );
}

function PaymentField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string | undefined; onChange: (value: string) => void }) {
  return createElement("div", { className: "field" }, createElement("label", { htmlFor: id }, label), createElement("input", { id, value, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value) }), error ? createElement("p", { className: "field-error", id: `${id}-error` }, error) : null);
}
