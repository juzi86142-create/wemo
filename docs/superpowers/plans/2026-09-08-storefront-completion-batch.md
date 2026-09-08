# Storefront Completion Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining storefront pages and visible interactions with the existing WEMOVE visual language, using explicit local demo state until live APIs are available.

**Architecture:** Add route-level workspace shells for `/admin` and `/dealer`, backed by small local fixture/view-model modules. Extend existing account, commerce, platform, and public-site features with focused client components and namespaced browser state. Keep live adapter calls and contract schemas at the existing boundaries; demo state is only used when the configured API is unavailable or the feature has no live endpoint.

**Tech Stack:** Next.js App Router 16, React, TypeScript, Vitest, existing `@wemo/contracts`, existing CSS token system, pnpm workspace.

## Global Constraints

- Preserve the current WEMOVE visual language: paper canvas, ink, coral, blue, lime, compact borders, restrained radius, and image-led public pages.
- Do not modify backend controllers, database schema, migrations, or payment-provider code.
- Reuse `SiteShell`, `AccountShell`, `StatusPanel`, `ProductCard`, existing adapters, contract schemas, and preview-cart helpers before adding new abstractions.
- Every interactive mutation exposes idle, pending, success, and error states; unsupported live operations remain visibly unavailable and retain user input.
- Demo records must be labeled as demo/preview and must not be represented as confirmed production records.
- New pure helpers get a focused Vitest test before their implementation.
- Preserve unrelated existing worktree changes and commit only files created or modified for this batch.

## File Map

### Shared and state

- Create: `apps/storefront/src/features/platform/demo-storage.ts` for safe namespaced local storage helpers.
- Create: `apps/storefront/src/features/platform/action-feedback.tsx` for reusable pending/success/error feedback.
- Modify: `apps/storefront/src/features/platform/index.ts` to export the shared helpers.
- Modify: `apps/storefront/src/app/globals.css` to extend existing layout tokens and workspace styles.

### Admin

- Create: `apps/storefront/src/features/admin/admin-fixtures.ts` for typed demo metrics, product rows, order rows, dealer applications, content rows, and settings.
- Create: `apps/storefront/src/features/admin/admin-workspace.tsx` for the client navigation shell and route content frame.
- Create: `apps/storefront/src/features/admin/admin-table.tsx` for reusable filterable table presentation.
- Create: `apps/storefront/src/features/admin/admin-editor.tsx` for controlled product/content/settings forms.
- Modify: `apps/storefront/src/features/admin/index.ts` to export admin components and fixtures.
- Create: `apps/storefront/src/app/(admin)/layout.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/page.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/products/page.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/orders/page.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/dealers/page.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/content/page.tsx`.
- Create: `apps/storefront/src/app/(admin)/admin/settings/page.tsx`.

### Dealer

- Create: `apps/storefront/src/features/dealer/dealer-fixtures.ts` for company, catalog, quote, order, and download demo records.
- Create: `apps/storefront/src/features/dealer/dealer-workspace.tsx` for the authenticated dealer shell and navigation.
- Create: `apps/storefront/src/features/dealer/dealer-catalog.tsx` for filtering and catalog rows/cards.
- Create: `apps/storefront/src/features/dealer/dealer-quick-order.tsx` for SKU/quantity rows and validation.
- Create: `apps/storefront/src/features/dealer/dealer-action-panel.tsx` for quote/order/company action feedback.
- Modify: `apps/storefront/src/features/dealer/index.ts` to export dealer components and fixtures.
- Create: `apps/storefront/src/app/(dealer)/layout.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/catalog/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/quick-order/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/quotes/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/orders/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/company/page.tsx`.
- Create: `apps/storefront/src/app/(dealer)/dealer/downloads/page.tsx`.

### Account and commerce

- Create: `apps/storefront/src/features/account/account-demo-state.ts`.
- Create: `apps/storefront/src/features/account/profile-editor.tsx`.
- Create: `apps/storefront/src/features/account/address-book.tsx`.
- Modify: `apps/storefront/src/features/account/index.ts`.
- Modify: `apps/storefront/src/app/(account)/account/profile/page.tsx`.
- Modify: `apps/storefront/src/app/(account)/account/addresses/page.tsx`.
- Modify: `apps/storefront/src/app/(account)/account/orders/page.tsx`.
- Modify: `apps/storefront/src/features/platform/site-shell.tsx` for cart count and logout/newsletter behavior.
- Create: `apps/storefront/src/features/commerce/cart-count.tsx`.
- Create: `apps/storefront/src/features/commerce/add-to-cart-button.tsx`.
- Create: `apps/storefront/src/features/commerce/payment-methods.tsx`.
- Modify: `apps/storefront/src/features/commerce/cart-view.tsx` and `cart-adapter.ts` for explicit live/demo action feedback.
- Modify: `apps/storefront/src/features/commerce/checkout-form.tsx` to include payment method state and review feedback.
- Modify: `apps/storefront/src/app/(public)/products/[slug]/page.tsx` and `apps/storefront/src/app/cart/page.tsx`.

### Public content and forms

- Create: `apps/storefront/src/features/public-site/content-fixtures.ts`.
- Create: `apps/storefront/src/features/public-site/contact-form.tsx`.
- Create: `apps/storefront/src/features/public-site/newsletter-form.tsx`.
- Create: `apps/storefront/src/features/public-site/content-card.tsx`.
- Modify: `apps/storefront/src/features/public-site/index.ts` and `support/page.tsx`.
- Create: `apps/storefront/src/app/(public)/content/page.tsx`.
- Create: `apps/storefront/src/app/(public)/content/[slug]/page.tsx`.

## Task 1: Shared Demo State and Feedback

**Files:**
- Create: `apps/storefront/src/features/platform/demo-storage.ts`.
- Create: `apps/storefront/src/features/platform/action-feedback.tsx`.
- Modify: `apps/storefront/src/features/platform/index.ts`.
- Test: `apps/storefront/src/features/platform/demo-storage.test.ts`.

- [ ] **Step 1: Write the failing storage tests.**

```ts
it("round-trips namespaced JSON and returns the fallback for malformed data", () => {
  const storage = createMemoryStorage();
  writeDemoValue(storage, "account", "profile", { name: "Alex" });
  expect(readDemoValue(storage, "account", "profile", null)).toEqual({ name: "Alex" });
  storage.setItem("wemo:demo:account:profile", "bad-json");
  expect(readDemoValue(storage, "account", "profile", null)).toBeNull();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the helpers do not exist.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/platform/demo-storage.test.ts`

- [ ] **Step 3: Implement safe browser/storage helpers and `ActionFeedback`.**

Use `wemo:demo:<scope>:<key>` keys, catch unavailable `window.localStorage`, and expose `idle | pending | success | error` props without throwing during server rendering.

- [ ] **Step 4: Run the focused test and storefront typecheck.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/platform/demo-storage.test.ts && pnpm --filter @wemo/storefront typecheck`

- [ ] **Step 5: Commit the shared state layer.**

```bash
git add apps/storefront/src/features/platform
git commit -m "feat: add storefront demo state primitives"
```

## Task 2: Admin Workspace Routes

**Files:** The admin files listed in the File Map.

- [ ] **Step 1: Add fixture shape tests for stable admin labels and status values.**

```ts
it("contains the dashboard sections used by every admin route", () => {
  expect(adminNav.map((item) => item.href)).toEqual([
    "/admin", "/admin/products", "/admin/orders", "/admin/dealers", "/admin/content", "/admin/settings",
  ]);
  expect(adminMetrics).toHaveLength(4);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing admin module fails.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/admin/admin-fixtures.test.ts`

- [ ] **Step 3: Implement typed fixtures and the reusable workspace shell.**

Use local arrays with IDs, labels, statuses, and amounts. Render a persistent navigation rail, `Demo workspace` badge, mobile select/navigation, page heading, and content slot. Use `StatusPanel` for empty/error states.

- [ ] **Step 4: Add the six admin routes.**

Dashboard shows metrics, recent orders, alerts, and quick links. Products, orders, dealers, and content use `AdminTable` with search/filter controls and detail/editor panels. Settings uses controlled profile/market/role panels. All forms show local success feedback and retain values on failure.

- [ ] **Step 5: Extend workspace CSS and verify routes.**

Run: `pnpm --filter @wemo/storefront typecheck && pnpm --filter @wemo/storefront build`

Request `/admin`, `/admin/products`, `/admin/orders`, `/admin/dealers`, `/admin/content`, and `/admin/settings` from the running dev server and require HTTP 200.

- [ ] **Step 6: Commit the admin workspace.**

```bash
git add apps/storefront/src/features/admin apps/storefront/src/app/(admin) apps/storefront/src/app/globals.css
git commit -m "feat: add admin workspace pages"
```

## Task 3: Authenticated Dealer Workspace Routes

**Files:** The dealer files listed in the File Map.

- [ ] **Step 1: Add fixture and validation tests.**

```ts
it("rejects quick-order rows without a SKU or positive quantity", () => {
  expect(validateQuickOrderRows([{ sku: "", quantity: 0 }])).toEqual({
    0: { sku: "Enter a SKU.", quantity: "Enter a quantity." },
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails before the dealer workspace exists.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/dealer/dealer-quick-order.test.ts`

- [ ] **Step 3: Implement the dealer workspace shell and demo fixtures.**

Reuse dealer display helpers and existing dealer application styles. The shell must show company name, account status, navigation, demo badge, and a responsive mobile navigation control.

- [ ] **Step 4: Implement catalog, quick order, quotes, orders, company, and downloads pages.**

Catalog supports search/category filters and quantity entry. Quick order supports add/remove rows, validation, clear, and local `Add all to cart` feedback. Quotes and orders support status filters and action panels. Company exposes profile/team/address/support sections. Downloads show permitted and unavailable rows.

- [ ] **Step 5: Verify routes and responsive layout.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/dealer && pnpm --filter @wemo/storefront typecheck`

Request `/dealer`, `/dealer/catalog`, `/dealer/quick-order`, `/dealer/quotes`, `/dealer/orders`, `/dealer/company`, and `/dealer/downloads` and require HTTP 200.

- [ ] **Step 6: Commit the dealer workspace.**

```bash
git add apps/storefront/src/features/dealer apps/storefront/src/app/(dealer) apps/storefront/src/app/globals.css
git commit -m "feat: add dealer workspace pages"
```

## Task 4: Account Editing and Order Actions

**Files:** The account files listed in the File Map.

- [ ] **Step 1: Add tests for profile and address demo transitions.**

```ts
it("updates a profile and removes an address in demo state", () => {
  const state = createAccountDemoState();
  expect(updateDemoProfile(state, { name: "Alex Green", phone: "123" }).profile.name).toBe("Alex Green");
  expect(removeDemoAddress(state, "address-1").addresses.some((item) => item.id === "address-1")).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing transitions fail.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/account/account-demo-state.test.ts`

- [ ] **Step 3: Implement local account state and controlled editors.**

Profile editor supports name, phone, locale, pending state, saved state, and reset. Address book supports add/edit/delete/default actions with confirmation and a local empty state. Add a visible logout action that clears the local session token and returns to `/login`.

- [ ] **Step 4: Add order action affordances.**

Keep the order detail read-only data display, but add reorder, return request, and support action panels with explicit demo feedback and no fabricated backend status.

- [ ] **Step 5: Verify account pages.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/account && pnpm --filter @wemo/storefront typecheck`

- [ ] **Step 6: Commit account improvements.**

```bash
git add apps/storefront/src/features/account apps/storefront/src/app/(account) apps/storefront/src/features/platform/site-shell.tsx apps/storefront/src/app/globals.css
git commit -m "feat: complete account editing surfaces"
```

## Task 5: Commerce Actions and Payment UI

**Files:** The commerce and product files listed in the File Map.

- [ ] **Step 1: Add tests for cart count and payment selection.**

```ts
it("counts visible cart items and requires a payment method before review", () => {
  expect(getCartItemCount({ items: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }] })).toBe(3);
  expect(validatePaymentSelection({ method: "" })).toEqual({ method: "Choose a payment method." });
});
```

- [ ] **Step 2: Run the focused tests and confirm the new helpers fail.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/commerce/cart-count.test.ts src/features/commerce/payment-methods.test.ts`

- [ ] **Step 3: Implement the add-to-cart client action.**

Use `addCartItem` in live mode and `replacePreviewQuantity`/`getPreviewCart` in preview mode. Show pending, success, and unavailable feedback in the existing product detail panel. Do not calculate authoritative totals in the browser.

- [ ] **Step 4: Implement cart count and action feedback.**

Expose a client cart count provider/hook from the visible cart snapshot and update it after local add/remove/quantity actions. Keep the current live remove limitation explicit while retaining the input and showing the error state.

- [ ] **Step 5: Add payment method and review state to checkout.**

Add card, bank transfer, and invoice/PO method choices as UI state only. Validate selection, show billing fields when required, show review summary, pending submission, controlled unavailable result, and successful local demo result.

- [ ] **Step 6: Verify commerce pages and product action.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/commerce && pnpm --filter @wemo/storefront typecheck`

Check `/products/roll-play-bowling-set`, `/cart`, `/checkout`, and `/order/success` at desktop and narrow widths.

- [ ] **Step 7: Commit commerce improvements.**

```bash
git add apps/storefront/src/features/commerce apps/storefront/src/app/(public)/products apps/storefront/src/app/cart apps/storefront/src/app/(public)/checkout apps/storefront/src/features/platform/site-shell.tsx apps/storefront/src/app/globals.css
git commit -m "feat: complete storefront commerce interactions"
```

## Task 6: Contact, Newsletter, and Content Pages

**Files:** The public content files listed in the File Map.

- [ ] **Step 1: Add tests for contact/newsletter validation.**

```ts
it("requires a valid contact email and newsletter email", () => {
  expect(validateContactForm({ name: "", email: "bad", message: "" })).toMatchObject({ name: expect.any(String), email: expect.any(String), message: expect.any(String) });
  expect(validateNewsletterEmail("bad")).toBe("Enter a valid email address.");
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing helpers fail.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/public-site/contact-form.test.ts src/features/public-site/newsletter-form.test.ts`

- [ ] **Step 3: Implement controlled contact and newsletter forms.**

Replace the support `mailto` action with a form that preserves values, validates fields, displays pending/success/error, and uses a labeled demo/unavailable outcome. Add the footer newsletter form with the same behavior and no silent button.

- [ ] **Step 4: Implement content fixtures, cards, index, and detail route.**

Create three typed demo articles with category, title, excerpt, body sections, tags, and reading time. Render `/content` with filters and `/content/[slug]` with breadcrumbs, body, related content, and not-found state. Mark fixtures as preview content.

- [ ] **Step 5: Verify public routes and build.**

Run: `pnpm --filter @wemo/storefront exec vitest run src/features/public-site && pnpm --filter @wemo/storefront typecheck`

Request `/content`, `/content/move-more-together`, `/support`, and `/` and require HTTP 200.

- [ ] **Step 6: Commit public interaction improvements.**

```bash
git add apps/storefront/src/features/public-site apps/storefront/src/app/(public)/support apps/storefront/src/app/(public)/content apps/storefront/src/features/platform/site-shell.tsx apps/storefront/src/app/globals.css
git commit -m "feat: complete public content and contact surfaces"
```

## Task 7: Full Verification and Handoff

**Files:**
- Modify: `docs/superpowers/verification/2026-09-08-storefront-completion.md`.
- Modify: `docs/requirements-traceability.md` only for evidence-backed frontend rows.

- [ ] **Step 1: Run the focused storefront suite.**

Run: `pnpm --filter @wemo/storefront test`

Expected: all storefront test files pass with no failures.

- [ ] **Step 2: Run typecheck and production build.**

Run: `pnpm --filter @wemo/storefront typecheck && pnpm --filter @wemo/storefront build`

Expected: both commands exit 0 and the route output includes every route from Tasks 2, 3, 5, and 6.

- [ ] **Step 3: Run route smoke checks.**

Request all public, account, admin, dealer, cart, checkout, order-success, and content routes from the local server. Require HTTP 200, a primary heading, and no `{Product}`, `{Price}`, or `{Count}` tokens.

- [ ] **Step 4: Review responsive and interaction states.**

Check desktop and narrow layouts for workspace navigation, table overflow, add-to-cart feedback, cart count, form focus, validation, pending, success, error, empty, and unavailable states.

- [ ] **Step 5: Record exact evidence and remaining backend boundaries.**

Document that all new demo behavior is frontend-only, live API/payment persistence remains outside this task, and list any route intentionally labeled demo/unavailable.

- [ ] **Step 6: Inspect the final diff and commit the verification document.**

Run: `git status --short` and `git diff --check`, then commit only the verification/traceability updates.

## Self-Review Checklist

- [ ] Every route in the design has a concrete task and file list.
- [ ] Every new pure behavior has a named failing test before implementation.
- [ ] No task relies on a backend change or unverified production success.
- [ ] New controls have explicit pending, success, error, or unavailable behavior.
- [ ] The existing uncommitted user files remain untouched unless a task explicitly requires them.
