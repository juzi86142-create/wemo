import Link from "next/link";
import type { Cart } from "@wemo/contracts";

import { formatMoney } from "./cart-adapter";

export function CartSummary({ cart }: { cart: Cart }) {
  return <aside className="cart-summary"><p className="eyebrow">YOUR TOTAL</p><div className="summary-row"><span>Subtotal</span><strong>{formatMoney(cart.subtotal_minor, cart.currency)}</strong></div><div className="summary-row muted"><span>Shipping</span><span>Calculated at checkout</span></div><div className="summary-total"><span>Total estimate</span><strong>{formatMoney(cart.total_minor, cart.currency)}</strong></div><Link className="button button-dark" href="/checkout">Continue to checkout <span aria-hidden="true">↗</span></Link><p className="summary-note">Final price, stock, shipping, and tax are confirmed at checkout.</p></aside>;
}
