# WEMOVE B2C Checkout Verification

Date: 2026-09-08

Baseline: `82c91027a656c57b78486eb004417c5931c973ad`

Branch: `feat/storefront-consumer-phase`

## Scope

This evidence covers the storefront implementation for the guest checkout form, authenticated prefill boundary, order-success snapshot, cart entry point, analytics events, preview safety, responsive empty/error states, and the explicit local contract-mock path. Payment-provider integration, guest order lookup, and a cart-delete endpoint remain outside this slice.

## Automated Gate

All commands were run from the repository root and returned exit code `0`:

| Command | Result |
| --- | --- |
| `pnpm --filter @wemo/contracts build` | `tsc -p tsconfig.build.json` passed |
| `pnpm exec vitest run scripts/storefront-contract-mock.test.ts` | 1 test file passed; 5 tests passed; 0 failures |
| `pnpm --filter @wemo/storefront typecheck` | `tsc --noEmit` passed |
| `pnpm --filter @wemo/storefront test` | 12 test files passed; 23 tests passed; 0 failures |
| `pnpm --filter @wemo/storefront build` | Next.js production build passed; `/checkout` and `/order/success` included |

## Preview Safety

The local API origin was absent/unreachable during this verification. Server HTML requests returned `200` for all routes below:

| Route | Observed state | Placeholder token scan |
| --- | --- | --- |
| `/cart` | preview cart with live-service notice | none of `{Product}`, `{Price}`, `{Count}` |
| `/checkout` | `Checkout is not available in preview.` | none of `{Product}`, `{Price}`, `{Count}` |
| `/order/success` | `Your order details are not here.` | none of `{Product}`, `{Price}`, `{Count}` |

The preview checkout branch does not render a submit form and therefore cannot claim a successful order. The success route does not render an order number or total without a schema-validated session snapshot.

## Contract Mock Verification

The local-only mock server is running on `127.0.0.1:4000` because Windows reserved the planned `4010` range in this environment. The storefront runs on `localhost:3000` with `WEMO_API_ORIGIN=http://127.0.0.1:4000`, `NEXT_PUBLIC_WEMO_CONTRACT_MOCK=true`, and a same-origin Next rewrite for `/api/v1/*`.

The mock uses `@wemo/contracts` for cart, checkout input, API error, and order response validation. It owns fixture prices and calculates totals server-side; client-supplied price fields are rejected. The response includes `X-Wemo-Environment: contract-mock`, and the UI visibly states: `CONTRACT MOCK ONLY. No live order will be created.`

The browser completed this guest flow:

- `/cart`: two fixture items, contract-mock notice, and `$76.00` estimate.
- `/checkout`: guest form rendered with the contract-mock notice; required contact and shipping fields submitted.
- `/order/success`: order `WMO-MOCK-D51989E8`, status `pending payment`, both fixture line items, and server-calculated `$76.00` total.

The mock handler tests also cover unknown variants, malformed/strict client price fields, contract-valid cart responses, and the HTTP boundary. The order-success snapshot regression test covers one-time consumption under React Strict Mode's repeated development effect.

## Browser Checks

The Codex in-app browser checked `/cart`, `/checkout`, and `/order/success` at a narrow viewport of `365px` width and `945px` height. Each route reported a document `scrollWidth` of `350px`; no horizontal overflow was observed.

The visible states verified were:

- `/cart`: preview cart, item quantities, server-derived preview totals, and unavailable checkout notice.
- `/checkout`: controlled unavailable/preview panel and return-to-cart link.
- `/order/success`: safe empty state with product link and no fabricated order data.

## Live API Status

Live checkout was not exercised because the local API and middleware dependencies were not running during this verification. The expected local services were not listening on ports `4000`, `5432`, `6379`, `9000`, or `1025`.

Follow-up startup diagnosis on Windows found that Docker Desktop 4.49.0 crashes during backend initialization with `initializing Inference manager: listening on unix://<HOME>\\AppData\\Local\\Docker\\run\\dockerInference` and `The filename, directory name, or volume label syntax is incorrect.` The engine pipe is consequently removed and `docker info` cannot connect. Disabling Docker Model Runner in the local Docker Desktop settings did not change the error, and the stale `dockerInference` runtime reparse point could not be moved by Windows. No local PostgreSQL, Redis, or MinIO executables/services are installed as an alternative runtime.

The frontend adapter is wired to `POST /api/v1/checkout`, validates `CheckoutCreateSchema` before submission, validates `OrderMutationResponseSchema` after the response, and does not submit client-calculated prices. The browser result above is contract-mock verification only; it does not create a live order or prove PostgreSQL/Redis persistence, notifications, payment behavior, or real backend authorization. A real guest checkout, authenticated profile/address prefill against live data, backend order response, and live success snapshot still require the local API stack to be started and seeded.

## Remaining Limitations

- Payment provider collection is intentionally out of scope for this phase.
- Guest order lookup is not added; the success view only consumes the bounded session snapshot.
- Cart item removal remains controlled by the existing contract gap; no fake delete endpoint was introduced.
- Full B2C acceptance remains `in-progress` until live API checkout and the remaining payment-related acceptance work are exercised.
