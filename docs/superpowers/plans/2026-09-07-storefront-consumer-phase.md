# WEMOVE Consumer Storefront Phase Implementation Plan

> REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Starting from commit 82c91027a656c57b78486eb004417c5931c973ad, turn the supplied visual prototypes into a responsive Next.js consumer public site, account area, cart, and order views in the only frontend application, apps/storefront.

**Architecture:** Use App Router route groups for public and account layouts, with platform, public-site, account, and commerce feature boundaries. Server components load first-screen data through one /api/v1 request boundary and validate responses with @wemo/contracts. When 82c9102 does not expose a usable controller, render a typed unavailable or empty state instead of inventing data or an API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, Vitest 5, Zod contracts, @wemo/ui, pnpm workspace.

## Global Constraints

- Baseline is 82c91027a656c57b78486eb004417c5931c973ad.
- apps/storefront is the only frontend application.
- Business data is read through /api/v1 and @wemo/contracts only; never import packages/database.
- Public pages server-render their main heading and primary links.
- Product, price, stock, permission, and order decisions come from API responses.
- Every page covers loading, success, empty, failure, permission where applicable, mobile layout, and keyboard focus.
- New interactions use visible focus states and respect prefers-reduced-motion.
- Final output is C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend.

## File Map

- apps/storefront/src/app/layout.tsx and globals.css: root metadata and global visual/accessibility rules.
- apps/storefront/src/app/(public): public shell, home, catalog, detail, search, and support routes.
- apps/storefront/src/app/(account): auth and account routes.
- apps/storefront/src/app/cart/page.tsx: cart route.
- apps/storefront/src/features/platform: request client, status panels, pagination, analytics names, site shell.
- apps/storefront/src/features/public-site: product adapters, cards, filters, media, and public modules.
- apps/storefront/src/features/account: auth form, account shell, session, profile, address, and order adapters.
- apps/storefront/src/features/commerce: cart adapters, line items, quantity control, and money summary.
- docs/requirements-traceability.md: update only evidence-backed requirements after verification.

---

### Task 1: Create the exact baseline output workspace

Files:
- Create C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend by cloning the repository.
- Create docs/superpowers/specs/2026-09-07-storefront-consumer-phase-design.md in that checkout.
- Create docs/superpowers/plans/2026-09-07-storefront-consumer-phase.md in that checkout.

Produces: a clean Git checkout whose HEAD is exactly 82c91027a656c57b78486eb004417c5931c973ad.

- [ ] Verify the target path. If it exists, inspect it and do not overwrite an unrelated directory.

Run:
~~~
$target = 'C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend'
if (Test-Path -LiteralPath $target) { Get-ChildItem -Force -LiteralPath $target }
~~~

Expected: absent or clearly the current task workspace.

- [ ] Clone and pin the exact commit.

Run:
~~~
git clone https://github.com/juzi86142-create/wemo.git 'C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend'
git -C 'C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend' checkout --detach 82c91027a656c57b78486eb004417c5931c973ad
git -C 'C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend' rev-parse HEAD
~~~

Expected: the last command prints 82c91027a656c57b78486eb004417c5931c973ad.

- [ ] Copy the approved design and plan into the checkout, install dependencies with pnpm install --frozen-lockfile, then run:
~~~
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
~~~
Expected: baseline results are recorded before feature edits.

- [ ] Create branch feat/storefront-consumer-phase and commit only the approved docs:
~~~
git switch -c feat/storefront-consumer-phase
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: plan consumer storefront phase"
~~~

### Task 2: Build the platform request boundary and shared states

Files:
- Create apps/storefront/src/features/platform/api-client.ts
- Create apps/storefront/src/features/platform/request-state.ts
- Create apps/storefront/src/features/platform/status-panel.tsx
- Create apps/storefront/src/features/platform/pagination.tsx
- Create apps/storefront/src/features/platform/analytics.ts
- Modify apps/storefront/src/features/platform/index.ts and apps/storefront/src/app/globals.css
- Test apps/storefront/src/features/platform/api-client.test.ts and pagination.test.ts

Interfaces:
- ApiError: status number, message string, optional requestId string.
- requestJson<T>(path: string, init?: RequestInit): Promise<T>: prefixes /api/v1, uses credentials include, parses JSON, preserves request_id, and throws ApiError for non-2xx.
- parsePageParams(searchParams: URLSearchParams): { page: number; pageSize: number; q?: string; sort?: string }.
- StatusPanel props: kind loading, empty, error, or forbidden; title; description; optional requestId; optional retry or link action.

- [ ] Write the failing tests first.

The pagination test must assert that page=-2&pageSize=200&q=bowling becomes page 1, pageSize 48, q bowling. The API test must mock a 503 JSON response containing request_id req-1 and assert that requestJson throws status 503 and requestId req-1.

- [ ] Run the focused tests and verify they fail because the modules do not exist.

Run:
~~~
pnpm --filter @wemo/storefront test -- src/features/platform/pagination.test.ts src/features/platform/api-client.test.ts
~~~

- [ ] Implement the helpers. Keep request bodies out of logs. Render loading with role status and errors with role alert. Pagination links must preserve unrelated query parameters.
- [ ] Run the focused tests and pnpm --filter @wemo/storefront typecheck. Expected: pass.
- [ ] Commit:
~~~
git add apps/storefront/src/features/platform apps/storefront/src/app/globals.css
git commit -m "feat: add storefront platform request boundary"
~~~

### Task 3: Implement public shell, home, catalog, detail, search, and support

Files:
- Create apps/storefront/src/app/(public)/layout.tsx
- Create apps/storefront/src/app/(public)/page.tsx
- Create apps/storefront/src/app/(public)/products/page.tsx
- Create apps/storefront/src/app/(public)/products/[slug]/page.tsx
- Create apps/storefront/src/app/(public)/search/page.tsx
- Create apps/storefront/src/app/(public)/support/page.tsx
- Create features/platform/site-shell.tsx
- Create features/public-site/catalog-adapter.ts, product-card.tsx, product-gallery.tsx, filter-bar.tsx, and index.ts
- Modify app/layout.tsx and globals.css
- Test catalog-adapter.test.ts and filter-bar.test.ts

Interfaces:
- CatalogPageData: items CatalogProduct[], page, pageSize, total, optional ApiError.
- getPublicProducts(params: CatalogProductListQuery): Promise<CatalogPageData>; use only a verified 82c9102 catalog route and return unavailable without fabricated products if no public controller exists.
- getPublicProduct(slug: string): Promise<CatalogProduct | null>; validate with CatalogProductResponseSchema.
- ProductCard accepts CatalogProduct and renders safe image fallback, tags, optional age range, and a dynamic /products/[slug] link.
- FilterBar preserves q, category_id, age, environment, skill, sort, and page URL state.

- [ ] Write failing tests for null product media, nullable age fields, filter URL preservation, and adapter response validation.
- [ ] Run:
~~~
pnpm --filter @wemo/storefront test -- src/features/public-site/catalog-adapter.test.ts src/features/public-site/filter-bar.test.ts
~~~
Expected: fail because adapters/components do not exist.
- [ ] Implement the shared shell using the prototype's paper, ink, coral, blue, and lime visual language. Remove the existing foundation-preview copy. Add a keyboard-accessible mobile navigation control; keep navigation as real links.
- [ ] Implement catalog adapters with CatalogProductListQuerySchema, CatalogProductResponseSchema, and CatalogProduct from @wemo/contracts. Render server-side headings, product names, filters, and links. Separate unavailable, error, and valid-empty panels. Build product metadata from validated data with brand fallback.
- [ ] Run focused tests, typecheck, and build. Expected: pass, and public HTML contains each main heading.
- [ ] Commit:
~~~
git add apps/storefront/src/app apps/storefront/src/features/public-site apps/storefront/src/features/platform
git commit -m "feat: build consumer public storefront"
~~~

### Task 4: Implement authentication and account pages

Files:
- Create apps/storefront/src/app/(account)/layout.tsx
- Create login/page.tsx, register/page.tsx, forgot-password/page.tsx
- Create account/page.tsx, account/profile/page.tsx, account/addresses/page.tsx, account/orders/page.tsx, account/orders/[id]/page.tsx
- Create features/account/auth-form.tsx, account-shell.tsx, account-adapter.ts, and tests auth-form.test.tsx and account-adapter.test.ts
- Modify features/account/index.ts

Interfaces:
- AuthForm accepts mode login, register, or forgot-password and an async onSubmit callback; it renders field errors, pending, success, and API failure states.
- getSession(): Promise<SessionActor | null>; validate SessionActorSchema, return null for 401, preserve other ApiError values.
- getAccountOrders(query: OrderListQuery): Promise<z.infer<typeof OrderListResponseSchema>>; validate OrderListResponseSchema and never accept client-supplied user_id for self-service.
- AccountShell accepts the resolved session actor and shows a sign-in panel when there is no session.

- [ ] Write tests for required fields, malformed email, password mismatch, reset success, 401 session, and order parsing.
- [ ] Run the focused account tests and verify failure.
- [ ] Implement native labels, aria-describedby, aria-invalid, pending state, and an alert/live region. Never store passwords or send them to analytics.
- [ ] Implement server-rendered session/order/address views. If 82c9102 has no usable controller, render unavailable/empty state while keeping the page structure complete; never expose private data without a session.
- [ ] Run focused tests, typecheck, and build. Expected: pass and unauthenticated routes show a sign-in entry.
- [ ] Commit:
~~~
git add apps/storefront/src/app apps/storefront/src/features/account
git commit -m "feat: add consumer authentication and account pages"
~~~

### Task 5: Implement cart and order presentation

Files:
- Create apps/storefront/src/app/cart/page.tsx
- Create features/commerce/cart-adapter.ts, cart-line-item.tsx, cart-summary.tsx, quantity-control.tsx, and index.ts
- Test cart-adapter.test.ts and quantity-control.test.tsx

Interfaces:
- getCart(): Promise<Cart | null>; validate CartSchema.
- updateCartItem(itemId: number, quantity: number): Promise<Cart>; reject non-positive quantities locally, validate returned cart.
- removeCartItem(itemId: number): Promise<Cart>; validate returned cart.
- formatMoney(amountMinor: number, currency: string): string; use Intl.NumberFormat.
- QuantityControl props: value, min, max, disabled, onChange; expose labelled increment/decrement buttons and a numeric input.

- [ ] Write tests for null/empty cart, USD/EUR money formatting, quantity validation, disabled pending controls, and rollback callback.
- [ ] Run focused tests and verify failure.
- [ ] Implement adapters from CartSchema and actual contract fields. Do not calculate final tax, shipping, inventory, or payment totals in the browser; label server values as estimates.
- [ ] Implement /cart with pending, empty, error, stale-item, guest, and signed-in states. Use a client component only for mutations; restore the server snapshot on failure and show request_id. Keep the summary after line items on mobile.
- [ ] Run focused tests, typecheck, and build. Expected: pass and keyboard controls work.
- [ ] Commit:
~~~
git add apps/storefront/src/app/cart apps/storefront/src/features/commerce
git commit -m "feat: add consumer cart presentation"
~~~

### Task 6: Visual, responsive, SEO, accessibility, and final verification

Files:
- Modify apps/storefront/src/app/layout.tsx, globals.css, and route metadata.
- Create docs/superpowers/verification/2026-09-07-storefront-consumer-phase.md.

- [ ] Run production build and start:
~~~
pnpm --filter @wemo/storefront build
pnpm --filter @wemo/storefront start
~~~
Use another port if 3000 is occupied and record it.
- [ ] Inspect desktop and mobile routes: /, /products, /products/example, /search?q=bowling, /support, /login, /account, and /cart. Verify no horizontal overflow, no visible brace-style placeholders, stable image loading, focus visibility, mobile navigation, and distinct loading/empty/error states.
- [ ] Verify server HTML:
~~~
Invoke-WebRequest http://localhost:3000/ | Select-Object -ExpandProperty Content
Invoke-WebRequest http://localhost:3000/products | Select-Object -ExpandProperty Content
~~~
Expected: each response contains its main heading and primary links without client JavaScript.
- [ ] Record exact commands, route coverage, API-unavailable limitations, and manual checks in the verification file. Update only evidence-backed rows in docs/requirements-traceability.md.
- [ ] Run the final gate:
~~~
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
~~~
Expected: all exit 0; absent backend routes remain documented limitations.
- [ ] Commit:
~~~
git add docs/superpowers/verification docs/requirements-traceability.md apps/storefront/src/app apps/storefront/src/features
git commit -m "docs: verify consumer storefront phase"
~~~

## Plan Self-Review

- Covers platform boundary, public pages, account pages, cart/order presentation, responsive/SEO/accessibility checks, and output location.
- Excludes dealer/admin pages and payment/fulfillment as approved.
- Does not invent API routes and preserves unavailable states when 82c9102 lacks controllers.
- No unspecified implementation step remains; all steps have concrete files, commands, or acceptance criteria.
- Contract names match the baseline: CatalogProduct, CatalogProductListQuery, CatalogProductResponseSchema, CartSchema, OrderListQuery, OrderListResponseSchema, and SessionActorSchema.
