# WEMOVE Public Dealer Entry Verification

Date: 2026-09-08

Baseline: `82c91027a656c57b78486eb004417c5931c973ad`

Branch: `feat/storefront-consumer-phase`

## Scope

This evidence covers the public dealer discovery route (`/dealers`) and the two-step dealer application route (`/dealers/apply`). It includes contract-validated adapters, country filtering, safe public address rendering, empty/error states, client validation, session draft recovery, API field-error mapping, submission analytics, and the success state for a validated response.

Authenticated dealer centre pages, pricing, quotes, orders, admin review, maps, and backend changes remain outside this slice.

## Automated Gate

All commands below returned exit code `0`:

| Command | Result |
| --- | --- |
| `pnpm --filter @wemo/contracts build` | `tsc -p tsconfig.build.json` passed |
| `pnpm --filter @wemo/storefront typecheck` | `tsc --noEmit` passed |
| `pnpm --filter @wemo/storefront test` | 16 test files passed; 37 tests passed; 0 failures |
| `pnpm --filter @wemo/storefront build` | Next.js production build passed; `/dealers` and `/dealers/apply` generated |
| `git diff --check` | passed |

The focused red/green draft and analytics test was run before implementation and failed because the draft module and event names were absent. After implementation it passed with the full storefront suite.

## Route Checks

The storefront was run at `http://localhost:3000` with `WEMO_API_ORIGIN=http://127.0.0.1:4000` and the existing contract-mock flag. The dealer endpoints are intentionally not covered by that mock.

| Route | Observed state | Data safety |
| --- | --- | --- |
| `/dealers` | HTTP 200; `Find a better way to move.`; explicit `The dealer network is taking a break.` panel | 0 listings and no fabricated dealer name when the API is unavailable |
| `/dealers/apply` | HTTP 200; `Bring better play closer.`; first business step and all business fields server-rendered | no application number or success state without a validated API response |

The browser verified required-field messages, transition from business to contact details, session draft recovery after reload, and preservation of entered values after a failed submission. A submission against the stopped API produced an error state and left the form editable.

The desktop browser view matched the existing warm-white, navy, coral, blue, and lime storefront language. The responsive CSS stacks the discovery and application layouts at 960px and the form fields/actions at 620px; a narrow viewport was not live-captured in this run.

## Contract Boundary

- `GET /dealer/public-listings?page=1&page_size=20&country=<country>` is parsed with `DealerPublicListingListResponseSchema`.
- `POST /dealer/applications` is validated with `DealerApplicationCreateSchema` before sending and `DealerApplicationMutationResponseSchema` after receiving.
- Public address JSON is allowlisted to known string fields only.
- The application form submits trimmed fields, uppercases currency, preserves optional empty values as `null`, and sends no child-data fields.
- `dealer_apply_start` fires once on mount; `dealer_apply_submit` fires only after a validated successful response.

## Live API Status

The API was not listening on `127.0.0.1:4000` during this verification. The browser log recorded `ECONNREFUSED` while attempting `POST /api/v1/dealer/applications`; no PostgreSQL or Redis-backed response was available. This is an environment blocker for live listing data, persisted applications, notifications, and the success screen, not an implementation skip.

The frontend still contains the complete request, response validation, success rendering, error rendering, draft clearing, and field-error mapping. No live success claim is made, and no fake dealer or fake application number is rendered.
