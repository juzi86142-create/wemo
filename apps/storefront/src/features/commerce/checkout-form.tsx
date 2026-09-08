"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Cart } from "@wemo/contracts";

import type { AccountAddresses, AccountProfile } from "../account/account-adapter";
import { ApiError } from "../platform/api-client";
import { CheckoutCreateSchema } from "@wemo/contracts";
import { formatMoney } from "./cart-adapter";
import { createCheckout } from "./checkout-adapter";
import { isContractMockMode } from "./contract-mock-mode";
import { writeOrderSuccessSnapshot } from "./order-success-snapshot";
import { validateCheckoutFields, type CheckoutFormValues } from "./checkout-validation";
import { PaymentMethods, type PaymentSelection, validatePaymentSelection } from "./payment-methods";

const emptyValues: CheckoutFormValues = {
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  couponCode: "",
  note: "",
};

const emptyPayment: PaymentSelection = { method: "" };

function textFromPayload(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}

function initialValues(profile?: AccountProfile, addresses: AccountAddresses = []): CheckoutFormValues {
  const address = addresses[0]?.payload;
  return {
    ...emptyValues,
    name: profile?.user.name ?? "",
    email: profile?.user.email ?? "",
    phone: profile?.user.phone ?? "",
    addressLine1: textFromPayload(address, ["line1", "address_line1", "street"]),
    addressLine2: textFromPayload(address, ["line2", "address_line2"]),
    city: textFromPayload(address, ["city", "town"]),
    region: textFromPayload(address, ["region", "state", "province"]),
    postalCode: textFromPayload(address, ["postal_code", "postalCode", "zip"]),
    country: textFromPayload(address, ["country", "country_code", "countryCode"]),
  };
}

export function CheckoutForm({
  cart,
  profile,
  addresses,
}: {
  cart: Cart;
  profile?: AccountProfile | undefined;
  addresses: AccountAddresses;
}) {
  const router = useRouter();
  const contractMock = isContractMockMode(process.env.NEXT_PUBLIC_WEMO_CONTRACT_MOCK);
  const [values, setValues] = useState(() => initialValues(profile, addresses));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [requestId, setRequestId] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [payment, setPayment] = useState<PaymentSelection>(emptyPayment);
  const [reviewing, setReviewing] = useState(false);

  function update(key: keyof CheckoutFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError(undefined);
    setRequestId(undefined);
    setReviewing(false);
  }

  function updatePayment(nextPayment: PaymentSelection) {
    setPayment(nextPayment);
    setErrors((current) => ({ ...current, method: "", billingName: "", billingAddress: "", purchaseOrder: "" }));
    setFormError(undefined);
    setRequestId(undefined);
    setReviewing(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = { ...validateCheckoutFields(values), ...validatePaymentSelection(payment) };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!reviewing) {
      setReviewing(true);
      setFormError(undefined);
      return;
    }

    const input = {
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
      ...(values.couponCode.trim() ? { coupon_code: values.couponCode.trim() } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
    };

    setPending(true);
    setFormError(undefined);
    setRequestId(undefined);
    try {
      const order = await createCheckout(CheckoutCreateSchema.parse(input));
      writeOrderSuccessSnapshot(order);
      router.push("/order/success");
    } catch (error) {
      if (error instanceof ApiError) {
        const mappedErrors: Record<string, string> = {};
        for (const fieldError of error.fieldErrors) {
          const field = fieldError.field.includes("shipping_address.")
            ? fieldError.field.replace("shipping_address.", "")
            : fieldError.field;
          const mappedField = field === "line1" ? "addressLine1" : field === "line2" ? "addressLine2" : field === "postal_code" ? "postalCode" : field;
          mappedErrors[mappedField] = fieldError.message;
        }
        setErrors(mappedErrors);
        setFormError(error.message);
        setRequestId(error.requestId);
      } else {
        setFormError("We could not place your order. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="checkout-layout" aria-labelledby="checkout-title">
      <div className="checkout-form-column">
        <div className="checkout-heading">
          <p className="eyebrow">CHECKOUT</p>
          <h1 id="checkout-title">Make room for the next move.</h1>
          <p>Tell us where to send your collection. Final price, stock, and order status come from the live service.</p>
          {contractMock ? <p className="contract-mock-banner" role="status">CONTRACT MOCK ONLY. No live order will be created.</p> : null}
        </div>
        <form className="checkout-form" onSubmit={submit} noValidate>
          <fieldset className="checkout-section">
            <legend>Contact details</legend>
            <Field id="checkout-name" label="Name" value={values.name} error={errors.name} autoComplete="name" onChange={(value) => update("name", value)} />
            <Field id="checkout-email" label="Email address" type="email" value={values.email} error={errors.email} autoComplete="email" onChange={(value) => update("email", value)} />
            <Field id="checkout-phone" label="Phone (optional)" type="tel" value={values.phone} error={errors.phone} autoComplete="tel" onChange={(value) => update("phone", value)} />
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Shipping address</legend>
            <Field id="checkout-address-line1" label="Address" value={values.addressLine1} error={errors.addressLine1} autoComplete="shipping address-line1" onChange={(value) => update("addressLine1", value)} />
            <Field id="checkout-address-line2" label="Apartment, suite, etc. (optional)" value={values.addressLine2} error={errors.addressLine2} autoComplete="shipping address-line2" onChange={(value) => update("addressLine2", value)} />
            <div className="checkout-field-grid">
              <Field id="checkout-city" label="City" value={values.city} error={errors.city} autoComplete="shipping address-level2" onChange={(value) => update("city", value)} />
              <Field id="checkout-region" label="State / region" value={values.region} error={errors.region} autoComplete="shipping address-level1" onChange={(value) => update("region", value)} />
              <Field id="checkout-postal-code" label="Postal code" value={values.postalCode} error={errors.postalCode} autoComplete="shipping postal-code" onChange={(value) => update("postalCode", value)} />
              <Field id="checkout-country" label="Country" value={values.country} error={errors.country} autoComplete="shipping country" onChange={(value) => update("country", value)} />
            </div>
          </fieldset>
          <PaymentMethods selection={payment} errors={errors} onChange={updatePayment} />
          <fieldset className="checkout-section">
            <legend>Order notes</legend>
            <Field id="checkout-coupon" label="Coupon code (optional)" value={values.couponCode} error={errors.couponCode} onChange={(value) => update("couponCode", value)} />
            <div className="field"><label htmlFor="checkout-note">Note (optional)</label><textarea id="checkout-note" name="note" rows={4} value={values.note} onChange={(event) => update("note", event.target.value)} /></div>
          </fieldset>
          {reviewing ? <section className="checkout-review" aria-labelledby="checkout-review-title"><p className="eyebrow">REVIEW</p><h2 id="checkout-review-title">Check your details before submitting.</h2><dl><div><dt>Payment</dt><dd>{payment.method === "card" ? "Card" : payment.method === "bank_transfer" ? "Bank transfer" : "Invoice / PO"}</dd></div><div><dt>Delivery</dt><dd>{values.addressLine1.trim()}, {values.city.trim()}</dd></div></dl><p>The live service confirms stock, shipping, tax, payment, and your final order total after you submit.</p></section> : null}
          {formError ? <p className="checkout-error" role="alert">{formError}{requestId ? <span> Request ID: {requestId}</span> : null}</p> : null}
          <div className="checkout-actions"><button className="button button-dark" type="submit" disabled={pending}>{pending ? "Placing order..." : reviewing ? "Place order" : "Review order"}<span aria-hidden="true">↗</span></button>{reviewing ? <button className="text-button" type="button" disabled={pending} onClick={() => setReviewing(false)}>Edit details</button> : null}<Link className="arrow-link" href="/cart">Back to cart <span aria-hidden="true">↗</span></Link></div>
        </form>
      </div>
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
        <p className="eyebrow">YOUR ORDER</p>
        <h2 id="checkout-summary-title">A small collection with a lot to do.</h2>
        <div className="checkout-items">{cart.items.map((item) => <div className="checkout-item" key={item.id}><span>{cartItemName(item)} × {item.quantity}</span><strong>{formatMoney(item.line_total_minor, item.currency)}</strong></div>)}</div>
        <div className="summary-total"><span>Cart estimate</span><strong>{formatMoney(cart.total_minor, cart.currency)}</strong></div>
        <p className="summary-note">The service confirms current stock, shipping, tax, and any discount when you place the order.</p>
      </aside>
    </section>
  );
}

function Field({ id, label, type = "text", value, error, autoComplete, onChange }: { id: string; label: string; type?: string; value: string; error?: string | undefined; autoComplete?: string | undefined; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={id} type={type} value={value} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />{error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null}</div>;
}

function cartItemName(item: Cart["items"][number]) {
  if (typeof item.snapshot === "object" && item.snapshot !== null && !Array.isArray(item.snapshot)) {
    const name = (item.snapshot as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) return name;
  }
  return "WEMOVE product";
}
