import Link from "next/link";

import { CartView, getCart } from "../../features/commerce";
import { StatusPanel } from "../../features/platform";

export default async function CartPage() {
  const result = await getCart();
  if (!result.cart) return <main className="page-main"><StatusPanel kind="error" title="Your cart is taking a break." description="We could not load your cart right now. Please try again shortly." requestId={result.error?.requestId} action={<Link className="button button-secondary" href="/cart">Try again</Link>} /></main>;
  return <main className="page-main"><CartView initialCart={result.cart} preview={result.preview} /></main>;
}
