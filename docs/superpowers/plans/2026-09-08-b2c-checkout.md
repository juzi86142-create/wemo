# WEMOVE B2C Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, contract-validated B2C checkout and order-success flow to the existing WEMOVE consumer storefront while preserving guest checkout, authenticated prefilling, preview safety, and the current editorial visual system.

**Architecture:** Keep the existing `requestJson` API boundary and add a commerce adapter that parses `CheckoutCreateSchema` before POST `/api/v1/checkout` and `OrderMutationResponseSchema` after the response. Use a server-rendered checkout route to load the live cart and optional account data, a client form for input and submission state, and a client success view that reads a schema-validated temporary order snapshot from `sessionStorage`. No new backend endpoint or client-supplied identity field is introduced.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, CSS, Vitest 5, `@wemo/contracts`, pnpm workspace.

## Global Constraints

- Baseline remains `82c91027a656c57b78486eb004417c5931c973ad` plus the existing `feat/storefront-consumer-phase` commits.
- Work in `C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend` on `feat/storefront-consumer-phase`.
- Checkout must support guests; authenticated users may receive profile/address prefills, but the server remains the source of identity and authorization.
- Product identity, price, stock, discount, order status, and totals come from `/api/v1` responses validated by `@wemo/contracts`.
- Preview carts and unavailable API states must never render a successful order or call checkout with fabricated product data.
- Use existing routes and contracts: `POST /api/v1/checkout`, `GET /api/v1/account/profile`, `GET /api/v1/account/addresses`, and `GET /api/v1/auth/sessions`.
- Do not add backend endpoints, database changes, payment-provider code, guest-order lookup, or a fake cart-delete endpoint.
- Preserve the existing warm-white/navy/coral/blue/lime visual language, focus-visible rules, reduced-motion rules, and responsive layout patterns.
- The storefront Vitest setup has no JSX transform, React Testing Library, or jsdom. Automated tests must remain pure TypeScript; route/component behavior is verified by build, server HTML, accessibility trees, and browser screenshots.

---

### Task 1: Add checkout adapter and pure input validation

**Files:**
- Create: `apps/storefront/src/features/commerce/checkout-adapter.ts`
- Create: `apps/storefront/src/features/commerce/checkout-validation.ts`
- Create: `apps/storefront/src/features/commerce/checkout-adapter.test.ts`
- Create: `apps/storefront/src/features/commerce/checkout-validation.test.ts`
- Modify: `apps/storefront/src/features/commerce/index.ts`

**Interfaces:**
- `createCheckout(input: CheckoutCreateInput): Promise<Order>` parses `CheckoutCreateSchema`, calls `requestJson<unknown>("/checkout", { method: "POST", body: JSON.stringify(parsed) })`, and returns `OrderMutationResponseSchema.parse(response).item`.
- `CheckoutFormValues` contains `name`, `email`, `phone`, `addressLine1`, `addressLine2`, `city`, `region`, `postalCode`, `country`, `couponCode`, and `note` strings.
- `validateCheckoutFields(values: CheckoutFormValues)` returns `Record<string, string>` with field-level messages and does not calculate money.

- [ ] **Step 1: Write failing adapter tests**

Mock the existing `requestJson` boundary using the same Vitest module-mocking pattern already used by `api-client.test.ts`. Cover:

```ts
it("posts only variant ids and quantities and returns the validated order", async () => {
  const order = makeOrder();
  requestJsonMock.mockResolvedValue({ request_id: "req-1", item: order });

  await expect(createCheckout({
    items: [{ variant_id: 1001, quantity: 2 }],
    contact: { name: "Alex", email: "alex@example.com" },
    shipping_address: { line1: "1 Main Street", city: "London", country: "GB" },
  })).resolves.toEqual(order);

  expect(requestJsonMock).toHaveBeenCalledWith("/checkout", {
    method: "POST",
    body: expect.stringContaining('"variant_id":1001'),
  });
  expect(JSON.parse(requestJsonMock.mock.calls[0]![1].body)).not.toHaveProperty("total_minor");
});

it("propagates API and contract errors", async () => {
  requestJsonMock.mockRejectedValue(new ApiError("Out of stock", 403, "req-2"));
  await expect(createCheckout(validInput)).rejects.toMatchObject({ status: 403, requestId: "req-2" });
});
```

Use a local fixture matching `OrderSchema`; do not import a database model or invent price fields in the input.

- [ ] **Step 2: Run the adapter test and confirm it fails**

Run:

```text
pnpm --filter @wemo/storefront test -- src/features/commerce/checkout-adapter.test.ts
```

Expected: FAIL because `checkout-adapter.ts` and `createCheckout` do not exist yet.

- [ ] **Step 3: Write failing validation tests**

Cover empty contact/address fields, malformed email, a valid guest form, optional coupon/note, and an address containing Unicode text. Assert that valid values return `{}` and invalid values expose stable field keys (`name`, `email`, `addressLine1`, `city`, `postalCode`, `country`).

- [ ] **Step 4: Implement the adapter and validation function**

Use the exact contract imports and keep the validation implementation small:

```ts
export async function createCheckout(input: CheckoutCreateInput): Promise<Order> {
  const parsed = CheckoutCreateSchema.parse(input);
  const response = OrderMutationResponseSchema.parse(
    await requestJson<unknown>("/checkout", {
      method: "POST",
      body: JSON.stringify(parsed),
    }),
  );
  return response.item;
}
```

`validateCheckoutFields` should trim checks for required text, use a simple email shape consistent with `validateAuthFields`, and never validate server-owned totals.

- [ ] **Step 5: Export and run focused tests**

Export the adapter and validation functions from `features/commerce/index.ts`, then run:

```text
pnpm --filter @wemo/storefront test -- src/features/commerce/checkout-adapter.test.ts src/features/commerce/checkout-validation.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit the adapter slice**

```text
git add apps/storefront/src/features/commerce/checkout-adapter.ts apps/storefront/src/features/commerce/checkout-validation.ts apps/storefront/src/features/commerce/checkout-adapter.test.ts apps/storefront/src/features/commerce/checkout-validation.test.ts apps/storefront/src/features/commerce/index.ts
git commit -m "feat: add contract validated checkout adapter"
```

### Task 2: Add safe order-success snapshot storage

**Files:**
- Create: `apps/storefront/src/features/commerce/order-success-snapshot.ts`
- Create: `apps/storefront/src/features/commerce/order-success-snapshot.test.ts`
- Modify: `apps/storefront/src/features/commerce/index.ts`

**Interfaces:**
- `writeOrderSuccessSnapshot(order: Order): void` validates `OrderSchema` before storing JSON under a namespaced key.
- `readOrderSuccessSnapshot(): Order | null` returns a parsed order or `null` for absent, malformed, or unavailable storage.
- `clearOrderSuccessSnapshot(): void` removes the key without throwing in non-browser contexts.

- [ ] **Step 1: Write failing storage tests**

Mock a minimal `window.sessionStorage` implementation and cover round-trip parsing, malformed JSON returning `null`, schema-invalid JSON returning `null`, clearing after read, and server-side execution where `window` is undefined.

- [ ] **Step 2: Run the storage test and confirm it fails**

Run:

```text
pnpm --filter @wemo/storefront test -- src/features/commerce/order-success-snapshot.test.ts
```

Expected: FAIL because the snapshot module does not exist.

- [ ] **Step 3: Implement the bounded storage helper**

Use a single constant key such as `wemo_checkout_order_snapshot`; store only the validated `Order` object returned from checkout. Catch storage access errors and return `null` rather than leaking browser quota or privacy-mode failures into the success page.

- [ ] **Step 4: Run tests and commit**

```text
pnpm --filter @wemo/storefront test -- src/features/commerce/order-success-snapshot.test.ts
git add apps/storefront/src/features/commerce/order-success-snapshot.ts apps/storefront/src/features/commerce/order-success-snapshot.test.ts apps/storefront/src/features/commerce/index.ts
git commit -m "feat: preserve checkout success snapshot safely"
```

### Task 3: Build the server-rendered checkout route and client form

**Files:**
- Create: `apps/storefront/src/app/(public)/checkout/page.tsx`
- Create: `apps/storefront/src/features/commerce/checkout-form.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/features/commerce/index.ts`

**Interfaces:**
- `CheckoutPage` calls `getCart()` and renders explicit empty/error/preview states before rendering a live checkout form.
- `CheckoutForm({ cart, profile, addresses }: { cart: Cart; profile?: AccountProfile; addresses: AccountAddresses })` owns input state and calls `createCheckout`.
- The form creates `CheckoutCreateInput` with `items` from `cart.items`, `contact`, `shipping_address`, optional `coupon_code`, and optional `note`; it never submits client totals or user IDs.

- [ ] **Step 1: Add the route-level HTML assertions**

Use a PowerShell server HTML check rather than JSX rendering. The check must assert that `/checkout` exposes a checkout heading, contact/address labels, and an unavailable/preview message when the API origin is unset. Assert the response contains no `{Product}`, `{Price}`, or `{Count}` tokens.

- [ ] **Step 2: Implement server data loading and safe branches**

In `app/(public)/checkout/page.tsx`:

```tsx
const result = await getCart();
if (!result.cart) {
  return <main className="page-main"><StatusPanel kind="error" title="Your cart is unavailable." description="Return to your cart and try again." action={<Link className="button button-secondary" href="/cart">Back to cart</Link>} /></main>;
}
if (result.preview) {
  return <main className="page-main"><StatusPanel kind="error" title="Checkout is not available in preview." description="Connect the live cart service before placing an order." action={<Link className="button button-secondary" href="/cart">Back to cart</Link>} /></main>;
}

const session = await getSession();
const profile = session ? await safeGetProfile() : undefined;
const addresses = session ? await safeGetAddresses() : [];
return <main className="checkout-page"><CheckoutForm cart={result.cart} profile={profile} addresses={addresses} /></main>;
```

Use explicit `try/catch` around optional profile/address prefill reads. A prefill failure must not turn a live cart into preview data or prevent guest checkout.

- [ ] **Step 3: Implement the form structure and prefill mapping**

Render a two-column desktop layout: form sections for contact and shipping address on the left, backend cart summary on the right. On mobile, stack form before summary. Map `IdentityProfileResponseSchema` values only into display defaults; the user can edit them. Address payloads remain JSON-compatible and no address id is submitted as authority.

Required controls:

```tsx
<label htmlFor="checkout-name">Name</label>
<input id="checkout-name" name="name" autoComplete="name" value={values.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} />
<label htmlFor="checkout-email">Email address</label>
<input id="checkout-email" name="email" type="email" autoComplete="email" value={values.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} />
<label htmlFor="checkout-address-line1">Address</label>
<input id="checkout-address-line1" name="addressLine1" autoComplete="shipping address-line1" value={values.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} aria-invalid={Boolean(errors.addressLine1)} />
```

Include phone, address line 2, city, region, postal code, country, coupon, note, a `type="submit"` button, and a visible order summary using `formatMoney(cart.total_minor, cart.currency)` only as a pre-submit estimate.

- [ ] **Step 4: Implement submit/error/success behavior**

On submit: run `validateCheckoutFields`, convert values to `CheckoutCreateInput`, set pending, call `createCheckout`, write the validated order snapshot, track the checkout result, and navigate to `/order/success`. On error: restore the editable form, map `ApiError.fieldErrors`, show the request id, and provide a link back to `/cart`. Disable the submit button while pending.

- [ ] **Step 5: Add checkout styles without changing the source palette**

Add focused styles for `.checkout-page`, `.checkout-layout`, `.checkout-form`, `.checkout-summary`, `.checkout-section`, `.checkout-error`, and `.checkout-preview`. Reuse existing border, surface, type, button, status, and responsive tokens. At `max-width: 960px`, use one column; at `max-width: 620px`, keep controls full width and avoid fixed-width fields.

- [ ] **Step 6: Run typecheck and inspect the route**

Run:

```text
pnpm --filter @wemo/storefront typecheck
Invoke-WebRequest http://localhost:3000/checkout | Select-Object -ExpandProperty Content
```

Expected: typecheck passes and the route shows a controlled unavailable/preview state when the API is not configured.

- [ ] **Step 7: Commit the checkout route**

```text
git add "apps/storefront/src/app/(public)/checkout/page.tsx" apps/storefront/src/features/commerce/checkout-form.tsx apps/storefront/src/features/commerce/index.ts apps/storefront/src/app/globals.css
git commit -m "feat: add live b2c checkout page"
```

### Task 4: Add the order-success route

**Files:**
- Create: `apps/storefront/src/app/(public)/order/success/page.tsx`
- Create: `apps/storefront/src/features/commerce/order-success-view.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/features/commerce/index.ts`

**Interfaces:**
- `OrderSuccessPage` renders the public shell route and delegates browser-only snapshot reading to `OrderSuccessView`.
- `OrderSuccessView` reads `readOrderSuccessSnapshot()` once on mount, clears the snapshot after loading, and exposes a safe empty state if no valid order is present.

- [ ] **Step 1: Write the empty-state HTML check**

Request `/order/success` and assert that its server-rendered shell contains a non-success fallback heading, a product link, and no order number or fabricated total. The client success state will be checked in the browser after a controlled checkout response.

- [ ] **Step 2: Implement the client success view**

Render two states:

```tsx
if (!order) {
  return <StatusPanel kind="empty" title="Your order details are not here." description="Return to the collection or check your account orders." action={<Link className="button button-dark" href="/products">Explore products</Link>} />;
}

return <section className="order-success"><p className="eyebrow">ORDER CONFIRMED</p><h1>Ready for the next move.</h1><p>Order {order.order_no}</p>{/* line items and server total */}</section>;
```

Use `order.items`, `order.status`, `order.total_minor`, and `order.currency` from the validated response. Do not fetch a guest order by id and do not place address/payment snapshots in the URL.

- [ ] **Step 3: Add styles and links**

Use the existing editorial section/card hierarchy. Provide `/products`, `/`, and `/account/orders` links; the account link can remain available even when the current user is a guest because the route will enforce the session state.

- [ ] **Step 4: Run typecheck, server HTML, and commit**

```text
pnpm --filter @wemo/storefront typecheck
Invoke-WebRequest http://localhost:3000/order/success | Select-Object -ExpandProperty Content
git add "apps/storefront/src/app/(public)/order/success/page.tsx" apps/storefront/src/features/commerce/order-success-view.tsx apps/storefront/src/features/commerce/index.ts apps/storefront/src/app/globals.css
git commit -m "feat: add safe order success page"
```

### Task 5: Connect the cart entry and analytics boundaries

**Files:**
- Modify: `apps/storefront/src/features/commerce/cart-summary.tsx`
- Modify: `apps/storefront/src/features/commerce/cart-view.tsx`
- Modify: `apps/storefront/src/features/platform/analytics.ts`
- Modify: `apps/storefront/src/features/commerce/cart-adapter.test.ts`
- Create: `apps/storefront/src/features/platform/analytics.test.ts`
- Create: `apps/storefront/src/features/commerce/checkout-link.tsx`

**Interfaces:**
- The cart summary continues linking to `/checkout` but clearly labels preview carts as unavailable for live checkout.
- `analyticsEvents` gains `beginCheckout`, `checkoutSuccess`, and `checkoutFailure`; `trackEvent` receives only safe scalar properties.
- Live cart quantity changes continue to use existing POST `/cart/items`; live remove remains a controlled `501` error because no remove contract exists.

- [ ] **Step 1: Add pure analytics/cart assertions**

Assert analytics event names are stable and cart preview/live branches do not claim a successful mutation when `removeCartItem` throws. Keep tests free of JSX imports.

- [ ] **Step 2: Implement minimal cart changes**

Add an explicit preview notice to the checkout CTA area and render a `CheckoutLink` client wrapper that tracks `begin_checkout` on click only when the cart has items. Do not add a request to an invented endpoint and do not change server totals.

- [ ] **Step 3: Run focused tests and commit**

```text
pnpm --filter @wemo/storefront test -- src/features/commerce/cart-adapter.test.ts src/features/platform/analytics.test.ts
pnpm --filter @wemo/storefront typecheck
git add apps/storefront/src/features/commerce/cart-summary.tsx apps/storefront/src/features/commerce/cart-view.tsx apps/storefront/src/features/commerce/checkout-link.tsx apps/storefront/src/features/platform/analytics.ts apps/storefront/src/features/commerce/cart-adapter.test.ts apps/storefront/src/features/platform/analytics.test.ts
git commit -m "feat: connect cart to checkout states"
```

### Task 6: Run live-mode and browser verification, then update evidence

**Files:**
- Modify: `docs/superpowers/verification/2026-09-08-b2c-checkout.md`
- Modify: `docs/requirements-traceability.md`

- [ ] **Step 1: Run the automated gate**

Run each command separately:

```text
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
```

Expected: every command exits `0`; test output reports zero failures and the build includes `/checkout` and `/order/success`.

- [ ] **Step 2: Verify preview safety**

With the API origin absent or unreachable, request `/cart`, `/checkout`, and `/order/success`. Confirm the checkout page displays unavailable/preview copy, no submit path can create an order, and no `{Product}`, `{Price}`, or `{Count}` token appears in server HTML.

- [ ] **Step 3: Verify live API wiring when the local API is available**

Start the repository middleware and API using the existing project workflow, then configure the storefront API origin to the local API. Use a seeded product/cart or a controlled API response to verify:

```text
cart -> checkout
guest contact/address submit -> POST /api/v1/checkout
server-returned order number/status/total -> /order/success
authenticated profile/address prefill -> editable form
```

Do not use real payment credentials or send data outside the local environment.

- [ ] **Step 4: Inspect desktop/mobile browser states**

Check live success, empty cart, preview/unavailable, validation error, API error, pending submission, and success snapshot fallback. Confirm keyboard focus, no horizontal overflow, correct summary totals, and readable order rows at narrow widths.

- [ ] **Step 5: Record evidence and update traceability**

Record exact command output, route list, API configuration state, preview safety result, live-mode result or blocker, browser routes, and remaining payment limitations in `docs/superpowers/verification/2026-09-08-b2c-checkout.md`. Move only checkout/order-success rows with evidence to `in-progress` or `done`; keep full B2C acceptance `in-progress` while payment remains out of scope.

- [ ] **Step 6: Commit verification evidence**

```text
git add docs/superpowers/verification/2026-09-08-b2c-checkout.md docs/requirements-traceability.md
git commit -m "docs: verify b2c checkout flow"
```

## Plan self-review

- Contract coverage: adapter inputs and outputs use `CheckoutCreateSchema` and `OrderMutationResponseSchema`; no prices are accepted from the client.
- Scope coverage: guest checkout, authenticated prefilling, preview safety, success snapshot, cart entry, errors, responsive UI, and evidence updates each have a task.
- Placeholder scan: no incomplete implementation marker or unspecified endpoint is used; the only “unavailable” behavior is the known cart-delete contract gap.
- Type consistency: `Order`, `CheckoutCreateInput`, `AccountProfile`, and `AccountAddresses` are existing contract/adapter types used consistently across tasks.
- Boundary check: checkout does not add payment code, guest lookup, database imports, or API changes.
