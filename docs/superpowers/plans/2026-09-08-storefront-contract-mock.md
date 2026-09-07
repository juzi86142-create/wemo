# Storefront Contract Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit local-only contract mock that exercises the existing storefront guest checkout and order-success flow without pretending to be the real backend.

**Architecture:** Add a standalone TypeScript mock under `scripts/` with a pure request handler and an HTTP wrapper. The handler validates cart and checkout payloads with `@wemo/contracts`, calculates order totals from server-owned fixtures, and returns contract-valid responses. The storefront is pointed at the mock only through explicit process environment variables and displays a visible contract-mock notice.

**Tech Stack:** Node.js `node:http`, TypeScript, `tsx`, Vitest 5, `@wemo/contracts`, Next.js 16 App Router.

## Global Constraints

- The mock binds only to `127.0.0.1` and defaults to port `4010`.
- The mock is never enabled by a production default and never modifies `apps/api`.
- Product identity, prices, totals, and order status in mock responses are server-owned fixtures and are validated by `@wemo/contracts`.
- The mock does not write PostgreSQL, Redis, MinIO, Mailpit, or project data files, and does not log contact or address values.
- The frontend continues using `requestJson`, `CheckoutCreateSchema`, `OrderMutationResponseSchema`, and the existing order-success snapshot.
- The browser and evidence documents must distinguish contract-mock verification from live backend acceptance.

---

### Task 1: Build the contract-validated mock handler

**Files:**
- Create: `scripts/storefront-contract-mock.ts`
- Create: `scripts/storefront-contract-mock.test.ts`

**Interfaces:**
- `createMockCartResponse(requestId: string): MockHttpResponse`
- `handleMockRequest(method: string, pathname: string, body: unknown, requestId: string): MockHttpResponse`
- `MockHttpResponse = { status: number; body: unknown }`

- [x] **Step 1: Write the failing handler tests**

Create pure Vitest tests covering:

```ts
it("returns a contract-valid cart fixture", () => {
  const response = createMockCartResponse("mock-cart-1");
  expect(CartMutationResponseSchema.parse(response.body).item.items).toHaveLength(2);
});

it("calculates checkout totals from server-owned fixture prices", () => {
  const response = handleMockRequest(
    "POST",
    "/api/v1/checkout",
    { items: [{ variant_id: 1001, quantity: 2 }], contact: { name: "Alex", email: "alex@example.com" }, shipping_address: { line1: "1 Main Street", city: "London", country: "GB" } },
    "mock-checkout-1",
  );
  const order = OrderMutationResponseSchema.parse(response.body).item;
  expect(order.total_minor).toBe(6400);
  expect(order.items[0]?.unit_price_minor).toBe(3200);
});

it("rejects unknown variants with an API error and no order", () => {
  const response = handleMockRequest(
    "POST",
    "/api/v1/checkout",
    { items: [{ variant_id: 9999, quantity: 1 }], contact: { name: "Alex", email: "alex@example.com" }, shipping_address: { line1: "1 Main Street", city: "London", country: "GB" } },
    "mock-checkout-2",
  );
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ request_id: "mock-checkout-2", field_errors: [] });
});

it("does not trust client-supplied price fields", () => {
  const response = handleMockRequest(
    "POST",
    "/api/v1/checkout",
    { items: [{ variant_id: 1001, quantity: 1, unit_price_minor: 1 }], contact: { name: "Alex", email: "alex@example.com" }, shipping_address: { line1: "1 Main Street", city: "London", country: "GB" } },
    "mock-checkout-3",
  );
  expect(response.status).toBe(400);
});
```

Run: `pnpm exec vitest run scripts/storefront-contract-mock.test.ts`

Expected: FAIL because the handler module and exports do not exist.

- [x] **Step 2: Implement fixtures, validation, and error responses**

Implement the smallest pure handler that:

- stores two variants with IDs `1001` and `1002`, names, SKUs, USD prices, and stock quantities;
- returns `{ request_id, item }` for cart and checkout responses;
- parses checkout input with `CheckoutCreateSchema` before reading items;
- calculates subtotal, tax `0`, shipping `0`, and total from the fixture price map;
- creates a B2C order with status `pending`, a generated mock order number, item snapshots, address snapshot, and status history;
- maps Zod issues to `{ code, message, field_errors, request_id }`;
- returns `404` for unknown paths, `405` for unsupported methods, and `409` for unknown variants.

Every response body must be parsed by the relevant contract schema before it is returned from the pure handler.

- [x] **Step 3: Run the focused tests and commit the handler**

Run: `pnpm exec vitest run scripts/storefront-contract-mock.test.ts`

Expected: all mock handler tests pass. Then commit:

```text
git add scripts/storefront-contract-mock.ts scripts/storefront-contract-mock.test.ts
git commit -m "feat: add contract validated storefront mock"
```

### Task 2: Add the local HTTP server and explicit start command

**Files:**
- Modify: `scripts/storefront-contract-mock.ts`
- Modify: `package.json`

**Interfaces:**
- `startMockServer(port?: number): Promise<import("node:http").Server>`
- Root command: `pnpm mock:storefront`

- [x] **Step 1: Write the HTTP boundary test**

Extend the mock test file with an HTTP smoke test that starts the server on an ephemeral port, sends `GET /api/v1/cart` and `POST /api/v1/checkout` using Node's `fetch`, and asserts `200`, JSON content type, and contract-valid bodies. Close the server in `finally`.

Run: `pnpm exec vitest run scripts/storefront-contract-mock.test.ts`

Expected: FAIL because `startMockServer` is not defined.

- [x] **Step 2: Implement the HTTP wrapper**

Use `node:http.createServer` to collect a bounded request body, generate a request ID from `x-request-id` or `mock-${randomUUID()}`, call `handleMockRequest`, and return JSON without logging request bodies. Bind to `127.0.0.1`; use `Number(process.env.WEMO_MOCK_PORT ?? 4010)` when no port argument is supplied. Print `CONTRACT MOCK ONLY` and the base URL after listening.

- [x] **Step 3: Add the root start command and run tests**

Add this root package script:

```json
"mock:storefront": "tsx scripts/storefront-contract-mock.ts"
```

Run:

```text
pnpm exec vitest run scripts/storefront-contract-mock.test.ts
pnpm --filter @wemo/storefront typecheck
```

Expected: mock tests pass and storefront typecheck exits `0`.

- [x] **Step 4: Commit the HTTP boundary**

```text
git add scripts/storefront-contract-mock.ts scripts/storefront-contract-mock.test.ts package.json
git commit -m "feat: expose storefront contract mock server"
```

### Task 3: Mark mock mode visibly in the storefront

**Files:**
- Modify: `apps/storefront/src/features/commerce/cart-view.tsx`
- Modify: `apps/storefront/src/features/commerce/checkout-form.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Create: `apps/storefront/src/features/commerce/contract-mock-mode.ts`
- Create: `apps/storefront/src/features/commerce/contract-mock-mode.test.ts`

**Interfaces:**
- Public env flag: `NEXT_PUBLIC_WEMO_CONTRACT_MOCK=true`
- Visible copy: `CONTRACT MOCK ONLY. No live order will be created.`

- [x] **Step 1: Write the failing environment assertion**

Write a pure test for `isContractMockMode(value: string | undefined): boolean` with `"true"` returning `true`, unset returning `false`, and `"false"` returning `false`. Keep this test free of JSX rendering dependencies.

Run: `pnpm --filter @wemo/storefront test -- src/features/commerce/contract-mock-mode.test.ts`

Expected: FAIL because `contract-mock-mode.ts` and `isContractMockMode` do not exist.

- [x] **Step 2: Implement the helper and notice**

Implement `isContractMockMode` and render the notice in the cart and checkout live-looking states only when `isContractMockMode(process.env.NEXT_PUBLIC_WEMO_CONTRACT_MOCK)` is true. Use existing editorial typography, border, surface, and responsive tokens; do not change the source palette or show the notice in the existing preview error branch.

- [x] **Step 3: Run checks and commit**

Run:

```text
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront typecheck
```

Expected: all storefront tests pass and typecheck exits `0`. Then commit:

```text
git add apps/storefront/src/features/commerce/cart-view.tsx apps/storefront/src/features/commerce/checkout-form.tsx apps/storefront/src/app/globals.css apps/storefront/src/features/commerce/contract-mock-mode.ts apps/storefront/src/features/commerce/contract-mock-mode.test.ts
git commit -m "feat: label storefront contract mock mode"
```

### Task 4: Run mock checkout in the browser and update evidence

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-storefront-contract-mock.md`
- Modify: `docs/superpowers/verification/2026-09-08-b2c-checkout.md`
- Modify: `docs/requirements-traceability.md`

- [x] **Step 1: Start the mock server**

Run `pnpm mock:storefront` in a persistent terminal and confirm it prints `CONTRACT MOCK ONLY` and listens on the configured loopback port. The default is `4010`; this Windows verification used `4000` because the `4010` range was reserved.

- [x] **Step 2: Restart the storefront with explicit mock variables**

Start the dev server with:

```powershell
$env:WEMO_API_ORIGIN = "http://127.0.0.1:4000"
$env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:4000"
$env:NEXT_PUBLIC_WEMO_CONTRACT_MOCK = "true"
pnpm --filter @wemo/storefront dev
```

Verify `/cart` is live-looking rather than preview, `/checkout` renders the guest form, and the visible mock notice is present.

- [x] **Step 3: Exercise the full guest flow**

In the browser, fill the required contact and shipping fields and submit. Verify that the request reaches `POST /api/v1/checkout`, the mock returns a contract-valid order, the URL becomes `/order/success`, and the page shows the mock order number, status, line items, and server-calculated total.

- [x] **Step 4: Verify negative paths**

Run the pure tests for malformed input and unknown variants. Confirm the frontend still displays field/API error states when the mock returns an API error. Confirm there is no order-success snapshot before a successful mock response.

- [x] **Step 5: Run final automated checks and record evidence**

Run:

```text
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
git diff --check
```

Update the verification document with mock server status, browser routes, mock order result, negative-path result, and the explicit statement that live backend acceptance remains pending. Mark only the mock verification slice as done; keep real B2C acceptance in-progress.

- [x] **Step 6: Commit evidence and update the plan**

```text
git add docs/superpowers/plans/2026-09-08-storefront-contract-mock.md docs/superpowers/verification/2026-09-08-b2c-checkout.md docs/requirements-traceability.md
git commit -m "docs: verify storefront contract mock flow"
```

### Completion note

The contract-mock slice is complete. The storefront was verified against the local mock through `/cart`, `/checkout`, and `/order/success`, including the Strict Mode-safe order snapshot consumption. This does not replace live backend acceptance: PostgreSQL, Redis, the API process, payment-provider behavior, and real order persistence remain pending.
