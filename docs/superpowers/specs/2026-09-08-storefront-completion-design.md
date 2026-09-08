# Storefront Completion Design

## Goal

Complete the remaining storefront-facing pages and interactions in the existing WEMOVE visual language, using local demo state where the live API is unavailable and keeping the backend contract boundary explicit.

## Scope

This phase covers five frontend areas:

1. Admin workspace routes and navigation.
2. Authenticated dealer workspace routes and navigation.
3. Account editing and address management surfaces.
4. Commerce interaction gaps: add to cart, cart count, cart feedback, and payment UI states.
5. Public contact, newsletter, and content/FAQ surfaces.

Backend implementation, database changes, payment-provider integration, live API acceptance, and automated test ownership remain outside this phase. The frontend must still expose complete loading, empty, error, forbidden, pending, success, and demo/unavailable states.

## Design Direction

Keep the current editorial WEMOVE system: paper canvas, ink typography, coral signal, blue structure, lime utility accents, compact borders, restrained radius, and image-led product presentation. New workspace pages use dense operational layouts with a fixed navigation rail, compact metrics, tables, filters, and action panels. Public pages continue using the existing `SiteShell`, page hero, status panels, cards, and form primitives.

## Route Map

### Admin

- `/admin`: overview dashboard with metrics, recent orders, alerts, and quick actions.
- `/admin/products`: product table, search/filter controls, product editor drawer/state.
- `/admin/orders`: order table, status filters, order detail panel, fulfillment actions.
- `/admin/dealers`: application queue, approval/rejection state, dealer detail panel.
- `/admin/content`: content list, draft/published state, content editor form.
- `/admin/settings`: profile, roles, market, and audit preference panels.

### Dealer

- `/dealer`: company dashboard with account status, order summary, quote summary, and quick order entry.
- `/dealer/catalog`: catalog grid/table with search, category filter, MOQ and stock metadata.
- `/dealer/quick-order`: SKU and quantity rows with validation, add-all action, and CSV-shaped input state.
- `/dealer/quotes`: quote list with draft, pending, accepted, expired states and detail panel.
- `/dealer/orders`: B2B order list with status filters, reorder and download action states.
- `/dealer/company`: company profile, team, addresses, and support cards.
- `/dealer/downloads`: product files and policy downloads with permission-aware states.

### Existing routes to enhance

- Product detail: interactive add-to-cart action using preview state or the existing adapter.
- Shared shell: derive the cart item count from the current client-visible cart state.
- Account profile: editable fields with pending, success, and error states.
- Account addresses: add, edit, delete, and default-address controls backed by local demo state.
- Account orders: visible action affordances for reorder, return request, and order support.
- Support: contact form with field validation, pending, success, and error states.
- Footer: newsletter form with validation and clear demo/unavailable status.
- Checkout: payment method selector, billing fields, review state, pending state, and controlled unavailable result.
- Public content: `/content` index and `/content/[slug]` detail pages using validated local fixtures until CMS responses are available.

## Architecture

Reuse existing feature boundaries:

- `features/platform`: shared workspace shell, navigation, status panels, and common action feedback.
- `features/admin`: admin navigation, fixture data, view models, and reusable table/editor components.
- `features/dealer`: dealer navigation, fixture data, catalog/order/quote components, and form state.
- `features/account`: editable profile/address components and local demo persistence.
- `features/commerce`: cart action controller, cart count hook, payment method UI, and checkout feedback.
- `features/public-site`: content fixtures, content cards, contact form, and newsletter form.

All local demo data must be labeled in the UI. It must not be presented as confirmed production data. When an API adapter is available, the page should call it first and fall back to the controlled demo/unavailable state according to the existing environment flag.

## State and Interaction Rules

- Every mutation has idle, pending, success, and error states.
- Local demo mutations update only namespaced browser storage or in-memory state.
- Account and dealer data never accepts a user-selectable company id as an authorization claim.
- Product prices, order totals, inventory, and permissions remain server-authoritative when a live API response exists.
- Unsupported live mutations show a clear unavailable message and retain the user input.
- Forms use native labels, `aria-invalid`, `aria-describedby`, keyboard-visible focus, and live status/error regions.
- Destructive actions require confirmation in the UI and expose a reversible or explicit result state.

## Reuse and File Boundaries

Prefer small additions next to the existing feature that owns the behavior. Avoid replacing `globals.css`; extend its existing token and layout sections. Use existing `ProductCard`, `StatusPanel`, `SiteShell`, `AccountShell`, `ApiError`, contract schemas, and preview cart helpers before adding new abstractions.

## Verification

- Add focused Vitest coverage for new pure helpers and state transitions before implementation.
- Run storefront tests and typecheck after each feature group.
- Run production build after all routes are added.
- Request every route from the local storefront and verify HTTP 200, primary heading, and no unresolved prototype tokens.
- Check desktop and narrow layouts for navigation, table overflow, form focus, and action feedback.

## Out of Scope

- Starting or repairing PostgreSQL, Redis, Mailpit, MinIO, or the API process.
- Implementing backend controllers, persistence, migrations, authorization, or payment provider calls.
- Claiming live order, dealer, account, payment, or notification success when only local demo state is available.
