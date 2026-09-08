# Public Dealer Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Implement the public dealer discovery and dealer application flow with contract-validated API wiring, complete UI states, and no fabricated data when the backend is unavailable.

**Architecture:** Add a small dealer feature boundary under `apps/storefront/src/features/dealer` for API adapters, validation, safe JSON display extraction, and session-storage drafts. Add server-rendered `/dealers` and `/dealers/apply` routes, with a client form only where browser state is required. Reuse `requestJson`, `StatusPanel`, existing WEMOVE styles, `@wemo/contracts`, and the current analytics event boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest 5, Zod contracts, browser `sessionStorage`.

## Global Constraints

- Product, dealer, address, application, approval, and status data must come from validated API responses.
- The implementation must not add backend endpoints, database changes, maps SDK code, dealer portal screens, or admin review screens.
- When the API is absent or unreachable, show an explicit error/unavailable state; never render fake dealer listings or a fake application number.
- Application input must use `DealerApplicationCreateSchema`; the response must use `DealerApplicationMutationResponseSchema`.
- Preserve the existing warm-white/navy/coral/blue/lime visual language, focus-visible rules, reduced-motion rules, and responsive layout patterns.
- Pure Vitest tests must remain free of JSX rendering dependencies, React Testing Library, and jsdom.
- Do not modify unrelated user changes in `apps/storefront/AGENTS.md` or the existing checkout evidence documents.

---

### Task 1: Add dealer adapters, validation, and safe display helpers

**Files:**
- Create: `apps/storefront/src/features/dealer/dealer-adapter.ts`
- Create: `apps/storefront/src/features/dealer/dealer-validation.ts`
- Create: `apps/storefront/src/features/dealer/dealer-display.ts`
- Create: `apps/storefront/src/features/dealer/dealer-adapter.test.ts`
- Create: `apps/storefront/src/features/dealer/dealer-validation.test.ts`
- Create: `apps/storefront/src/features/dealer/dealer-display.test.ts`
- Modify: `apps/storefront/src/features/dealer/index.ts`

**Interfaces:**
- `getPublicDealerListings(query: { page: number; page_size: number; country?: string }): Promise<DealerPageData>` returns validated items, pagination, and an `ApiError | undefined` without fabricating fallback data.
- `createDealerApplication(input: DealerApplicationCreateInput): Promise<DealerApplication>` validates input, posts to `/dealer/applications`, and returns the validated response item.
- `DealerApplicationFormValues` contains `legalName`, `displayName`, `country`, `website`, `businessType`, `taxId`, `contactName`, `contactEmail`, `contactPhone`, and `currency` strings.
- `validateDealerApplication(values: DealerApplicationFormValues): Record<string, string>` returns stable field keys and never sends a request.
- `readPublicAddress(payload: unknown): { line1?: string; city?: string; region?: string; postalCode?: string; country?: string; phone?: string }` returns only known string fields.

- [x] **Step 1: Write failing adapter and helper tests**

Use the existing `vi.mock("../platform/api-client")` pattern. Add tests for:

```ts
it("requests public listings with the country filter", async () => {
  requestJsonMock.mockResolvedValue({ request_id: "req-1", items: [], page: 1, page_size: 20, total: 0 });
  await expect(getPublicDealerListings({ page: 1, page_size: 20, country: "GB" })).resolves.toMatchObject({ items: [], total: 0 });
  expect(requestJsonMock).toHaveBeenCalledWith("/dealer/public-listings?page=1&page_size=20&country=GB");
});

it("validates an application response and does not accept malformed payloads", async () => {
  requestJsonMock.mockResolvedValue({ request_id: "req-2", item: makeDealerApplication() });
  await expect(createDealerApplication(validApplicationInput)).resolves.toMatchObject({ application_no: "APP-1" });
  requestJsonMock.mockResolvedValue({ request_id: "req-3", item: { status: "submitted" } });
  await expect(createDealerApplication(validApplicationInput)).rejects.toThrow();
});
```

Also test validation for empty legal/display/contact fields, malformed email and website, non-three-letter currency, a valid input, and optional website/tax/phone. Test `readPublicAddress` with known keys, nested/unknown JSON, and non-string values.

- [x] **Step 2: Run the focused tests and confirm the expected failure**

Run:

```text
pnpm --filter @wemo/storefront test -- src/features/dealer/dealer-adapter.test.ts src/features/dealer/dealer-validation.test.ts src/features/dealer/dealer-display.test.ts
```

Expected: FAIL because the new dealer modules and exports do not exist.

- [x] **Step 3: Implement the adapter and pure helpers**

Implement `getPublicDealerListings` with `DealerPublicListingListResponseSchema.parse(await requestJson<unknown>("/dealer/public-listings?" + toQueryString(query)))`. Catch `ApiError` and return `{ items: [], page, pageSize, total: 0, error }`; convert non-API failures to `new ApiError("Dealer listings are unavailable.", 0)`. Implement `createDealerApplication` with `DealerApplicationCreateSchema.parse` and `DealerApplicationMutationResponseSchema.parse`. Keep `readPublicAddress` allowlisted and return `{}` for unknown values.

- [x] **Step 4: Run tests and commit the contract boundary**

Run the focused command again and then:

```text
pnpm --filter @wemo/storefront typecheck
git add apps/storefront/src/features/dealer apps/storefront/src/features/dealer/index.ts
git commit -m "feat: add contract validated dealer adapters"
```

Expected: all focused tests and typecheck pass.

### Task 2: Build the public dealer listings route

**Files:**
- Create: `apps/storefront/src/app/(public)/dealers/page.tsx`
- Create: `apps/storefront/src/features/dealer/dealer-listing-card.tsx`
- Modify: `apps/storefront/src/features/dealer/index.ts`
- Modify: `apps/storefront/src/app/globals.css`

**Interfaces:**
- `DealersPage` reads `searchParams.country`, calls `getPublicDealerListings`, and renders the route without client state.
- `DealerListingCard` accepts one validated `DealerPublicListing` and renders company identity plus safe public address details.

- [x] **Step 1: Add the route-level failing HTML check**

Add a PowerShell check that requests `/dealers` and asserts the current response is a 404 before the route exists. Keep the check as the red proof for the missing route, then replace it with assertions for `Find a dealer`, `Become a dealer`, and an unavailable state when the API origin is absent.

- [x] **Step 2: Implement the server-rendered listings route**

Use `DealerPublicListingListResponseSchema` through the adapter. Render a page hero, a native country `<select>` submitted by GET, a `Become a dealer` link, and listing cards. If `data.error` exists, render `StatusPanel kind="error"` with its request id and retry link. If the validated list is empty without an error, render `StatusPanel kind="empty"` with a clear filter reset. Never render unvalidated companies.

- [x] **Step 3: Implement listing cards and responsive styling**

Display only validated `company.display_name`, `company.business_type`, `company.country`, optional `company.website`, and address values extracted by `readPublicAddress`. Use a two-column discovery layout above 960px and one column below it. Add keyboard-visible controls, readable link text, and no map SDK dependency. Keep the listing region usable when there are zero results.

- [x] **Step 4: Run route checks and commit**

Run:

```text
pnpm --filter @wemo/storefront typecheck
Invoke-WebRequest http://localhost:3000/dealers | Select-Object -ExpandProperty Content
```

Expected: the route returns server-rendered dealer headings and, with the backend stopped, the explicit unavailable panel rather than fake listings. Commit:

```text
git add "apps/storefront/src/app/(public)/dealers/page.tsx" apps/storefront/src/features/dealer apps/storefront/src/app/globals.css
git commit -m "feat: add public dealer discovery page"
```

### Task 3: Build the two-step dealer application flow

**Files:**
- Create: `apps/storefront/src/app/(public)/dealers/apply/page.tsx`
- Create: `apps/storefront/src/features/dealer/dealer-application-form.tsx`
- Create: `apps/storefront/src/features/dealer/dealer-draft.ts`
- Create: `apps/storefront/src/features/dealer/dealer-draft.test.ts`
- Modify: `apps/storefront/src/features/dealer/index.ts`
- Modify: `apps/storefront/src/features/platform/analytics.ts`
- Modify: `apps/storefront/src/features/platform/analytics.test.ts`
- Modify: `apps/storefront/src/app/globals.css`

**Interfaces:**
- `DealerApplicationForm` owns step, values, field errors, pending, API error, and success state.
- `writeDealerDraft(values): void`, `readDealerDraft(): DealerApplicationFormValues | null`, and `clearDealerDraft(): void` use a namespaced `sessionStorage` key and remain safe when `window` is unavailable.
- `analyticsEvents.dealerApplyStart` is `dealer_apply_start`; `analyticsEvents.dealerApplySubmit` is `dealer_apply_submit`.

- [x] **Step 1: Write failing draft and analytics tests**

Test draft round-trip, malformed JSON returning `null`, schema-invalid draft returning `null`, clearing after a successful submission, and server-side safety. Extend analytics tests to assert the two stable event names.

- [x] **Step 2: Run tests and confirm the expected failure**

Run:

```text
pnpm --filter @wemo/storefront test -- src/features/dealer/dealer-draft.test.ts src/features/platform/analytics.test.ts
```

Expected: FAIL because the draft helpers and new event constants do not exist.

- [x] **Step 3: Implement draft storage, analytics names, and the application form**

Implement the two steps exactly as specified in the design. Save a draft after edits, restore it on mount, and clear it only after `createDealerApplication` returns a schema-validated application. Fire `dealer_apply_start` once from a guarded effect. On submit, create the exact contract input with `currency.toUpperCase()`, map `ApiError.fieldErrors` to stable field names, keep values on failure, and show request id. On success show the returned `application_no` and `status` with links to `/dealers` and `/`.

When the API is unavailable, the form remains complete and editable; no success copy or fabricated application number is shown.

- [x] **Step 4: Add the application route and styles**

Render the public shell route with the complete form, step indicator, business/contact field groups, privacy/application notice, and no child-data fields. Add styles for `.dealer-page`, `.dealer-discovery`, `.dealer-listings`, `.dealer-application`, `.dealer-stepper`, `.dealer-form-grid`, `.dealer-success`, and `.dealer-draft-note`, including mobile stacking at 960px and 620px.

- [x] **Step 5: Run focused checks and commit**

Run:

```text
pnpm --filter @wemo/storefront test -- src/features/dealer/dealer-draft.test.ts src/features/platform/analytics.test.ts
pnpm --filter @wemo/storefront typecheck
Invoke-WebRequest http://localhost:3000/dealers/apply | Select-Object -ExpandProperty Content
```

Expected: form labels and the first step appear in server HTML; the stopped backend is represented only by the later client/API error state. Commit:

```text
git add "apps/storefront/src/app/(public)/dealers/apply/page.tsx" apps/storefront/src/features/dealer apps/storefront/src/features/platform/analytics.ts apps/storefront/src/features/platform/analytics.test.ts apps/storefront/src/app/globals.css
git commit -m "feat: add dealer application flow"
```

### Task 4: Verify routes, update evidence, and finish the slice

**Files:**
- Modify: `docs/requirements-traceability.md`
- Create: `docs/superpowers/verification/2026-09-08-public-dealer-entry.md`
- Modify: `docs/superpowers/plans/2026-09-08-public-dealer-entry.md`

- [x] **Step 1: Run focused and production checks**

Run:

```text
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
git diff --check
```

Expected: frontend and contract checks pass. If `pnpm test` or live API checks fail because PostgreSQL/Redis/API are stopped, record the exact failing integration tests as an environment blocker without changing the feature to hide the failure.

- [x] **Step 2: Verify browser states**

Use the running storefront at `http://localhost:3000` to inspect `/dealers` and `/dealers/apply` at desktop and narrow widths. Verify navigation no longer 404s, listing unavailable/empty states do not fabricate data, the application form is editable, required validation is visible, and the form preserves values after a simulated API failure. When a controlled API response is unavailable, do not claim the application success screen was live-verified.

- [x] **Step 3: Record evidence and traceability**

Record route URLs, accessibility-visible headings, responsive observations, command results, API availability, and any live-integration blocker in the verification document. Add `P-030`, `P-031`, `DLR-001` through `DLR-005`, and `CT`/dealer application evidence only for the implemented slice; keep authenticated dealer center requirements planned.

- [x] **Step 4: Mark the plan and commit evidence**

Mark completed steps with `[x]`, leave no false live-backend claim, then run:

```text
git add docs/superpowers/verification/2026-09-08-public-dealer-entry.md docs/superpowers/plans/2026-09-08-public-dealer-entry.md docs/requirements-traceability.md
git commit -m "docs: verify public dealer entry flow"
```
