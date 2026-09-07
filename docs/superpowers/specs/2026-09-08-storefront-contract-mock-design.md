# Storefront Contract Mock Design

Date: 2026-09-08

Status: Approved design, implementation pending

## Goal

Provide a local-only contract mock so the storefront checkout journey can be exercised when the real API and middleware are unavailable. The mock validates the same request and response contracts used by the storefront and is explicitly not a replacement for live backend acceptance.

## Scope

The mock covers the minimum guest B2C journey:

- `GET /api/v1/cart`
- `GET /api/v1/auth/sessions`
- `POST /api/v1/checkout`

The storefront continues to use its existing `requestJson`, checkout adapter, `CheckoutCreateSchema`, `OrderMutationResponseSchema`, order snapshot, and success route. No production API controller, database model, payment integration, or frontend business boundary changes are introduced.

## Architecture

Add `scripts/storefront-contract-mock.ts` as a standalone TypeScript process started explicitly for local verification. It binds to `127.0.0.1` on a configurable port, defaults to `4010`, and prints `CONTRACT MOCK ONLY` at startup.

The mock imports `@wemo/contracts` schemas. Its fixture contains two variants with server-owned names, prices, currencies, and quantities. The cart response is parsed with `CartMutationResponseSchema`. Checkout requests are parsed with `CheckoutCreateSchema`; the handler looks up variant prices from its own fixture, calculates the order totals, builds a B2C order, and parses the response with `OrderMutationResponseSchema` before returning it.

The mock returns an unauthenticated response for `GET /api/v1/auth/sessions`, so the checkout page follows the supported guest path. It does not accept client-supplied prices, user IDs, order totals, or payment data as authority.

## Runtime Boundary

The mock is enabled by the start command, not by a production default. The storefront development server receives:

```text
WEMO_API_ORIGIN=http://127.0.0.1:4010
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4010
```

The mock never writes PostgreSQL, Redis, MinIO, Mailpit, or project data files. It keeps request handling in memory and only retains the current process fixture. Personal contact and address values are not persisted or logged.

## Error Handling

Malformed checkout input returns the existing API error shape with a request ID and field errors. Unknown variants return a controlled out-of-stock API error. Unexpected handler failures return a generic API error without exposing request body contents. The frontend must continue displaying these errors through its existing `ApiError` mapping.

## Verification

Tests are written first for the mock request handler:

- cart response validates against `CartMutationResponseSchema`;
- checkout accepts variant IDs and quantities but ignores any client price fields;
- checkout response validates against `OrderMutationResponseSchema`;
- malformed input and unknown variants return the expected API error shape.

After implementation, run the focused mock tests, storefront typecheck, and full storefront tests. Start the mock and storefront with the explicit environment variables, then verify in the browser:

1. `/cart` renders the mock cart as a live, non-preview cart.
2. `/checkout` renders the guest form.
3. Filling the form sends `POST /api/v1/checkout` to the mock and navigates to `/order/success`.
4. `/order/success` shows the mock server-returned order number, line items, status, and total.
5. The browser network path and page copy identify the environment as contract mock, not live backend.

The evidence document must state that this verifies frontend contract wiring only. Live acceptance remains pending until the repository API and middleware run successfully.

## Non-Goals

- Do not add a fake production endpoint or silently enable the mock.
- Do not modify `apps/api` or its database behavior.
- Do not simulate payment capture, email delivery, inventory persistence, or authenticated prefilling.
- Do not label the mock order as a real order or update the live order-success acceptance to done.
