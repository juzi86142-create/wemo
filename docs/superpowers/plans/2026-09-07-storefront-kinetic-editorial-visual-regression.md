# Kinetic Editorial Storefront Visual Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the consumer storefront to the supplied Kinetic Editorial visual system while keeping all existing `/api/v1` and `@wemo/contracts` data connections intact.

**Architecture:** Keep the current App Router routes, platform request boundary, adapters, status panels, and client-only mutation components. Replace the current presentation layer with shared design tokens, an editorial site shell, media-aware product cards, structured catalog/account/cart layouts, and explicit preview/unavailable states. Backend response data remains authoritative; visual fixtures never replace production responses.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, CSS, Vitest 5, `@wemo/contracts`, pnpm workspace.

**Execution notes:** The storefront Vitest setup does not include a JSX transform, React Testing Library, or jsdom. The planned `.tsx` component tests were therefore removed rather than introducing a second test toolchain. Component structure and responsive presentation were verified through production build output, server-rendered HTML, browser accessibility trees, and desktop/mobile screenshots; existing pure TypeScript adapter and utility tests remain the automated component-boundary checks.

## Global Constraints

- Baseline remains commit `82c91027a656c57b78486eb004417c5931c973ad` plus the existing consumer phase commits.
- Final output remains `C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend`.
- Product, media, account, order, cart, price, stock, and permission decisions come from `/api/v1` responses validated by `@wemo/contracts`.
- The visual source of truth is `kinetic_editorial/DESIGN.md` and the supplied consumer screenshots.
- Use `#FAF9F5`, `#F2F2EE`, `#FFFFFF`, `#142536`, `#2766D7`, `#F2573F`, and `#C7DF37`; accents stay low-volume and are not mixed indiscriminately in one component hierarchy.
- Use a Hanken Grotesk-first font stack, 4-12px corner radii, hairline structural borders, low-contrast shadows, visible focus styles, and `prefers-reduced-motion` support.
- Do not add dealer, admin, checkout, payment, or invented API endpoints.
- Do not expose original prototype placeholders such as `{Product}`, `{Price}`, or `{Count}` in rendered UI.

---

### Task 1: Restore design tokens and the editorial site shell

**Files:**
- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/features/platform/site-shell.tsx`
- Modify: `apps/storefront/src/app/(public)/layout.tsx`
- Modify: `apps/storefront/src/app/layout.tsx`

**Interfaces:**
- `SiteShell({ children }: { children: React.ReactNode })` remains the public layout boundary.
- The shell keeps real links for `/products`, `/support`, `/login`, and `/cart`; `/dealers` remains visibly marked as a later route only if the existing link is retained.

- [x] **Step 1: Replace the global tokens and shell presentation**

Define CSS variables for the exact palette, Hanken-first font stack, 1400px max content width, 20px mobile gutter, 32px desktop gutter, 4px/8px/12px radii, and hairline border color. Build the shell as a light fixed header with brand, text navigation, compact utility links, a keyboard-accessible mobile menu, a multi-column footer, and a newsletter region. Keep `focus-visible` and reduced-motion rules.

- [x] **Step 2: Run the production and type checks**

Run: `pnpm --filter @wemo/storefront typecheck`

Run: `pnpm --filter @wemo/storefront build`

Then request `/` and inspect the shell through the browser accessibility tree.

Expected: PASS with no new TypeScript errors.

- [x] **Step 3: Commit the shell slice**

```text
git add apps/storefront/src/app/globals.css apps/storefront/src/features/platform/site-shell.tsx apps/storefront/src/app/(public)/layout.tsx apps/storefront/src/app/layout.tsx
git commit -m "feat: restore kinetic editorial storefront shell"
```

### Task 2: Make media rendering backend-aware without changing the contract boundary

**Files:**
- Modify: `apps/storefront/src/features/public-site/product-card.tsx`
- Modify: `apps/storefront/src/features/public-site/product-gallery.tsx`
- Modify: `apps/storefront/src/features/public-site/catalog-adapter.ts`
- Modify: `apps/storefront/src/features/public-site/index.ts`
- Modify: `apps/storefront/src/app/globals.css`
- Test: `apps/storefront/src/features/public-site/catalog-adapter.test.ts`

**Interfaces:**
- `ProductCard({ product }: { product: CatalogProduct })` continues to consume only validated `CatalogProduct` data.
- `ProductGallery({ product }: { product: CatalogProduct })` continues to use `primary_image_url` when present and a bounded fallback when absent.
- `getPublicProducts` and `getPublicProduct` continue to validate API responses with `CatalogProductListResponseSchema` and `CatalogProductResponseSchema`.

- [x] **Step 1: Add tests for real media and safe fallback**

Cover a product with `primary_image_url`, a product with `null` media, nullable ages, and a long backend-provided name in the existing adapter tests. Image alt text and the absence of brace-style prototype tokens are checked through server-rendered route HTML and browser inspection.

- [x] **Step 2: Run the focused tests and confirm the current presentation is incomplete**

Run: `pnpm --filter @wemo/storefront test -- src/features/public-site/catalog-adapter.test.ts`

Expected: the new media/layout assertions fail against the current flat placeholder card.

- [x] **Step 3: Implement media-aware editorial cards**

Render a white card with a 4:5 warm-neutral media frame, backend image when available, product type/age labels, backend name and description, and a real detail link. Render a branded bounded media state when the URL is absent. Do not add price fields that are not present in `CatalogProduct`.

- [x] **Step 4: Run focused tests and typecheck**

Run: `pnpm --filter @wemo/storefront test -- src/features/public-site/catalog-adapter.test.ts`

Run: `pnpm --filter @wemo/storefront typecheck`

Expected: PASS.

- [x] **Step 5: Commit the media slice**

```text
git add apps/storefront/src/features/public-site apps/storefront/src/app/globals.css
git commit -m "feat: align product media with editorial cards"
```

### Task 3: Rebuild the home page as an editorial storefront

**Files:**
- Modify: `apps/storefront/src/app/(public)/page.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/features/public-site/product-card.tsx`

**Interfaces:**
- Home continues to call `getPublicProducts({ page: 1, page_size: 3, sort: "featured" })`.
- Home continues to render a preview banner only when the adapter reports preview mode.

- [x] **Step 1: Define the server-rendered home HTML check**

Use the existing server HTML request check rather than adding a component test renderer. Assert the page contains the main product call to action, the editorial sections, a product collection heading, a support link, and preview labeling when the adapter returns preview data.

- [x] **Step 2: Run the focused page test and confirm the current geometry is different from the source screenshots**

Run after implementation: `Invoke-WebRequest http://localhost:3000/ | Select-Object -ExpandProperty Content` and assert the source-aligned section labels and primary links are present.

- [x] **Step 3: Implement the source-aligned home structure**

Build a split hero with a warm editorial media panel, a text-led “play that gets everyone moving” block, category cards with restrained accents, a three-card product collection, a lifestyle/support panel, an active-play benefits row, and a multi-column content footer supplied by `SiteShell`. Keep all product and link text dynamic or explicitly authored, never prototype brace tokens.

- [x] **Step 4: Run focused tests, typecheck, and inspect the home route**

Run: `pnpm --filter @wemo/storefront typecheck`

Inspect `http://localhost:3000/` at desktop and mobile widths for overflow, focus visibility, and section rhythm.

- [x] **Step 5: Commit the home slice**

```text
git add apps/storefront/src/app/(public)/page.tsx apps/storefront/src/app/globals.css apps/storefront/src/features/public-site/product-card.tsx
git commit -m "feat: restore editorial storefront home"
```

### Task 4: Rebuild catalog, search, and product detail layouts around live content

**Files:**
- Modify: `apps/storefront/src/app/(public)/products/page.tsx`
- Modify: `apps/storefront/src/app/(public)/products/[slug]/page.tsx`
- Modify: `apps/storefront/src/app/(public)/search/page.tsx`
- Modify: `apps/storefront/src/features/public-site/filter-bar.tsx`
- Modify: `apps/storefront/src/features/public-site/product-gallery.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Test: `apps/storefront/src/features/public-site/filter-bar.test.ts`

**Interfaces:**
- Catalog query parameters continue to use `CatalogProductListQuery` and URL-preserving pagination.
- Detail pages continue to consume `getPublicProduct(slug)` and render unavailable/empty states when the backend response is absent.

- [x] **Step 1: Add URL and layout tests**

Assert that filters preserve `q`, `sort`, and unrelated query values. Assert that detail media renders a backend image or a bounded fallback and that the add-to-cart region remains a visible controlled action.

- [x] **Step 2: Run focused tests and confirm the old horizontal filter layout is insufficient**

Run: `pnpm --filter @wemo/storefront test -- src/features/public-site/filter-bar.test.ts`

Expected: the new sidebar/media assertions fail before the layout change.

- [x] **Step 3: Implement catalog and detail layouts**

Use a metrics-led page heading, active filter chips, a left filter rail at desktop that collapses into a stacked filter region on mobile, a three-column editorial product grid, and a source-aligned content banner. Use a two-column detail page with a large 4:5 media frame, thumbnails, backend title/description/age facts, and a clearly styled add-to-cart region. Keep server values authoritative and retain all unavailable/empty/error panels.

- [x] **Step 4: Run focused tests, typecheck, and build**

Run: `pnpm --filter @wemo/storefront test -- src/features/public-site/filter-bar.test.ts`

Run: `pnpm --filter @wemo/storefront typecheck`

Run: `pnpm --filter @wemo/storefront build`

Expected: all commands exit `0` and catalog/detail headings are present in server HTML.

- [x] **Step 5: Commit the catalog/detail slice**

```text
git add apps/storefront/src/app/(public)/products apps/storefront/src/app/(public)/search apps/storefront/src/features/public-site apps/storefront/src/app/globals.css
git commit -m "feat: restore editorial catalog and detail pages"
```

### Task 5: Align account and cart surfaces with the same source system

**Files:**
- Modify: `apps/storefront/src/features/account/account-shell.tsx`
- Modify: `apps/storefront/src/features/commerce/cart-line-item.tsx`
- Modify: `apps/storefront/src/features/commerce/cart-summary.tsx`
- Modify: `apps/storefront/src/features/commerce/cart-view.tsx`
- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/app/(account)/**/*.tsx`
- Modify: `apps/storefront/src/app/cart/page.tsx`
- Test: `apps/storefront/src/features/commerce/cart-adapter.test.ts`
- Test: `apps/storefront/src/features/commerce/quantity-control.test.ts`

**Interfaces:**
- Account routes continue to use `getSession`, `getAccountOrders`, and address adapters without accepting client-supplied user IDs.
- Cart continues to use `getCart`, `updateCartItem`, `removeCartItem`, `replacePreviewQuantity`, and `removePreviewItem`; live-mode unsupported mutations remain controlled errors.

- [x] **Step 1: Add visual structure tests without coupling to CSS implementation**

Assert the account shell exposes the account navigation and sign-in state. Assert cart line items expose media, stock/status text, quantity controls, remove action, summary heading, and preview/unavailable messaging.

- [x] **Step 2: Run focused tests**

Run: `pnpm --filter @wemo/storefront test -- src/features/commerce/cart-adapter.test.ts src/features/commerce/quantity-control.test.ts`

Expected: new source-aligned structure assertions fail before the component changes.

- [x] **Step 3: Implement account and cart presentation**

Use warm neutral account backgrounds, white content cards, compact navy navigation, structured profile/address/order tables, and source-aligned auth forms. Rebuild cart rows with 4:5 media, stock/status metadata, quantity stepper, save/remove controls where supported, compatible-item region, and a white sticky order summary. Preserve server-provided totals and make preview/unavailable messaging visible.

- [x] **Step 4: Run focused tests and typecheck**

Run: `pnpm --filter @wemo/storefront test -- src/features/commerce/cart-adapter.test.ts src/features/commerce/quantity-control.test.ts`

Run: `pnpm --filter @wemo/storefront typecheck`

Expected: PASS with no data-boundary regressions.

- [x] **Step 5: Commit the account/cart slice**

```text
git add apps/storefront/src/features/account apps/storefront/src/features/commerce apps/storefront/src/app/(account) apps/storefront/src/app/cart apps/storefront/src/app/globals.css
git commit -m "feat: align account and cart with editorial system"
```

### Task 6: Perform browser verification and close the traceability record

**Files:**
- Modify: `docs/superpowers/verification/2026-09-07-storefront-consumer-phase.md`
- Modify: `docs/requirements-traceability.md`
- Modify: any route metadata files required by the visual rebuild

- [x] **Step 1: Run the complete automated gate**

Run each command separately from the output directory:

```text
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
```

Expected: every command exits `0`; storefront tests report zero failures.

- [x] **Step 2: Inspect the source-aligned routes**

Inspect `/`, `/products`, `/products/<preview-slug>`, `/search?q=bowling`, `/support`, `/login`, `/account`, and `/cart` in desktop and mobile views. Check no horizontal overflow, no visible prototype braces, stable media fallback, visible focus, keyboard mobile navigation, and consistent warm-white/navy/accent palette.

- [x] **Step 3: Verify server HTML and backend fallback behavior**

Request `/` and `/products` with `Invoke-WebRequest`; assert the main headings and primary links are present. With the API unset, confirm development preview labeling and explicit unavailable states. Confirm no production-only path renders fabricated official data.

- [x] **Step 4: Record evidence and update only evidence-backed traceability rows**

Add exact command results, route list, visual checks, backend limitations, and the final output path to the verification document. Keep public site, user center, information architecture, search, SEO, and UI/UX rows `in-progress` until their full requirements are covered; do not mark the phase as a full platform acceptance.

- [x] **Step 5: Commit the verification record**

```text
git add docs/superpowers/verification docs/requirements-traceability.md
git commit -m "docs: verify kinetic editorial storefront regression"
```

## Plan self-review

- Spec coverage: the palette, typography, shell, page structures, backend boundary, preview behavior, accessibility, and verification requirements each map to Tasks 1-6.
- Placeholder scan: no unresolved placeholder or unspecified implementation marker is present.
- Type consistency: existing adapter and component names are retained; new tests target the exact route/component boundaries used by the implementation.
- Scope check: dealer/admin/checkout/payment work remains excluded; the plan is one visual-regression project within the already implemented consumer phase.
