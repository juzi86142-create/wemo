# Public Dealer Entry Design

Date: 2026-09-08

Baseline: `82c91027a656c57b78486eb004417c5931c973ad`

Branch: `feat/storefront-consumer-phase`

## Goal

Implement the public dealer discovery and dealer application flow without inventing listing data or treating a stopped API as a successful submission.

## Scope

The slice covers two public routes:

- `/dealers`: searchable public dealer listings with country filtering, readable listing cards, an empty state, an API error state, and a link to apply.
- `/dealers/apply`: a two-step application form for company and contact details, client-side validation, draft preservation in `sessionStorage`, pending state, contract-validated submission, and a success or API error state.

The slice does not implement the authenticated dealer portal, dealer pricing, quick order, quotes, order management, admin review, maps SDK integration, or backend changes.

## Contracts and Data Flow

The storefront adds a dealer adapter that uses the existing `requestJson` boundary:

- `GET /dealer/public-listings?page=1&page_size=20&country=<country>` is parsed with `DealerPublicListingListResponseSchema`.
- `POST /dealer/applications` is parsed before submission with `DealerApplicationCreateSchema` and parsed after submission with `DealerApplicationMutationResponseSchema`.

The server remains authoritative for published companies, addresses, approval, and application status. The UI reads display fields only from validated responses. JSON address payloads are converted to display text with a defensive helper; unknown payload shapes never become fabricated addresses.

When the API origin is absent, unreachable, or returns an error:

- `/dealers` shows a service-unavailable state with request id when available and a retry action; it does not show fake dealers.
- `/dealers/apply` still renders the complete editable form, but submission reports the API error and keeps entered values.
- Browser and build verification records the unavailable backend as an infrastructure blocker, not as an implementation omission.

## Interaction Design

`/dealers` uses the existing WEMOVE editorial system: warm-white page background, navy headings, restrained blue/coral/lime accents, thin borders, and the existing focus-visible treatment. The desktop layout is a two-column discovery surface: a quiet visual region for the search context and a dense listing column for comparison. On narrow screens it becomes one column, with the filter before the result list.

Each listing displays the validated company name, business type, country, published address details when present, website link when present, and a clear `Become a dealer` route. A listing count and no-results message are rendered from response state, never from hard-coded inventory.

`/dealers/apply` uses a two-step form:

1. Business: legal name, public display name, country, business type, website, tax id, and currency.
2. Contact: contact name, email, phone, and a final submission action.

The current step, validation errors, and submission status are announced accessibly. Draft values are saved under a namespaced session-storage key after edits and cleared only after a validated successful response. The form includes the existing privacy/application notice but does not collect children's data.

## Error and Success Behavior

- Required field and email/URL/currency validation prevents a request and exposes stable field keys.
- API field errors map to the corresponding form step and preserve the request id.
- Network and server errors keep the form editable and do not show an application number.
- A successful `DealerApplicationMutationResponseSchema` response shows the returned application number and status, with links back to dealer listings and the public home page.
- Analytics uses the existing `dealer_apply_start` and `dealer_apply_submit` event names with scalar-safe payloads only. A start event fires once when the application form mounts; submit fires only after the API returns success.

## Testing and Verification

Pure Vitest tests cover:

- request paths, query serialization, contract parsing, and rejection of malformed responses;
- required-field, email, URL, currency, and optional-field validation;
- safe display extraction from JSON address payloads;
- draft round-trip and clearing behavior without JSX or jsdom.

Route verification covers:

- server HTML for `/dealers` and `/dealers/apply` when the API is not configured;
- no fabricated dealer or application data in unavailable/error states;
- production build route generation;
- browser accessibility trees and desktop/mobile screenshots for listing, empty, error, form, and success states when a controlled API response is available.

The absence of PostgreSQL, Redis, or the API process is recorded as a live-integration blocker. It does not justify removing the adapter, form submission, success handling, or error handling from the implementation.
