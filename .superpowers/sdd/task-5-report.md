# Task 5 Report: Commerce Actions and Payment UI

## Status

DONE

## Commit

- Implementation: `216357d feat: complete storefront commerce interactions`

## Changes

- Replaced the static product-detail cart control with a client add-to-cart action. It uses the live cart adapter when available and existing preview-cart helpers in preview mode, with pending, success, and unavailable feedback.
- Added a client cart-count hook and header indicator. It derives its value from cart item quantities and receives browser-local cart updates from product and cart actions.
- Added explicit pending, success, and error feedback to cart quantity and remove actions. The existing live remove limitation remains visible and does not remove the line locally.
- Added card, bank-transfer, and invoice/PO payment selections, payment validation, required card billing and PO fields, a review step, pending submit state, and the existing controlled live-service unavailable result.
- Added focused commerce styles in the existing WEMOVE visual language without computing authoritative tax, shipping, inventory, payment, or final-order totals in the browser.

## TDD

1. Added `cart-count.test.ts` and `payment-methods.test.ts` before implementation.
2. RED command:
   `pnpm --filter @wemo/storefront exec vitest run src/features/commerce/cart-count.test.ts src/features/commerce/payment-methods.test.ts`
   failed as expected because `./cart-count` and `./payment-methods` did not yet exist.
3. GREEN command passed: 2 files, 2 tests.

## Verification

1. Focused commerce tests:
   `pnpm --filter @wemo/storefront exec vitest run src/features/commerce`
   - Passed: 8 files, 15 tests.
2. Full storefront tests:
   `pnpm --filter @wemo/storefront test`
   - Passed: 24 files, 48 tests.
3. Typecheck:
   `pnpm --filter @wemo/storefront typecheck`
   - Passed with exit code 0.
4. Production build:
   `pnpm --filter @wemo/storefront build`
   - Passed with exit code 0; 31 routes generated.
5. Runtime route checks against `http://localhost:3000`:
   - `/products/roll-play-bowling-set`: HTTP 200; product heading present; no `{Product}`, `{Price}`, or `{Count}` token.
   - `/cart`: HTTP 200; cart heading present; no prototype token.
   - `/checkout`: HTTP 200; the existing explicit preview-unavailable state rendered because no live cart service is running.
   - `/order/success`: HTTP 200; existing no-order snapshot state rendered; no prototype token.
6. Browser interaction and responsive checks:
   - The product add button displayed the local-preview success feedback and changed the header indicator to `Cart 3` in the active browser view.
   - At a 390px viewport override, product, cart, and checkout each reported `scrollWidth === clientWidth === 375`; there was no document-level horizontal overflow.
7. `git diff --check` and `git diff --cached --check` passed before the implementation commit.

## Concerns

- Live cart, checkout, payment confirmation, inventory, shipping, tax, and final order totals remain backend-owned. This task intentionally does not claim a server-side mutation when the API is unavailable.
- Preview cart updates are client-view state. Navigating to a server-rendered cart page reloads the existing default preview snapshot until the cart API is connected; the active product-page header update is verified, but preview state is not a replacement for persisted cart data.
- The checkout route correctly remains unavailable in preview mode by its existing route-level boundary. The expanded payment and review UI becomes available when the live cart route supplies a non-preview cart.
- Pre-existing user/generated working-tree changes outside the Task 5 files were preserved and are not part of `216357d`.

## Follow-up Fixes

- Added `checkout-payload.ts` so the selected payment method reaches the existing checkout contract; card billing details use `billing_address`, and invoice/PO references remain in the supported `note` field.
- Added a priced preview fixture for variant `1003` and dynamic preview line creation.
- Initialized preview cart pages from the shared client preview snapshot so product-to-cart navigation keeps the visible cart aligned with the header count.
- Added regression tests for checkout payload construction and an unseeded preview variant. Commerce verification now passes with 9 files / 18 tests.
