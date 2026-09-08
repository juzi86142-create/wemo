import type { Cart } from "@wemo/contracts";

import { formatMoney } from "./cart-adapter";
import { CheckoutLink } from "./checkout-link";

export function CartSummary({ cart, preview = false }: { cart: Cart; preview?: boolean }) {
  return <aside className="cart-summary"><p className="eyebrow">YOUR TOTAL</p><div className="summary-row"><span>Subtotal</span><strong>{formatMoney(cart.subtotal_minor, cart.currency)}</strong></div><div className="summary-row muted"><span>Shipping</span><span>Calculated at checkout</span></div><div className="summary-total"><span>Total estimate</span><strong>{formatMoney(cart.total_minor, cart.currency)}</strong></div><CheckoutLink itemCount={cart.items.length} preview={preview} /><p className="summary-note">{preview ? "Items and totals carry into the frontend demo checkout." : "Final price, stock, shipping, and tax are confirmed at checkout."}</p></aside>;
}
