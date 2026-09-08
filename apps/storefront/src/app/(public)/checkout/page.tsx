import Link from "next/link";

import { CheckoutForm } from "../../../features/commerce";
import { getAddresses, getProfile, getSession } from "../../../features/account";
import { getCart } from "../../../features/commerce";
import { StatusPanel } from "../../../features/platform";

async function optionalProfile() {
  try {
    return (await getProfile()).item;
  } catch {
    return undefined;
  }
}

async function optionalAddresses() {
  try {
    return (await getAddresses()).items;
  } catch {
    return [];
  }
}

export default async function CheckoutPage() {
  const result = await getCart();
  if (!result.cart) {
    return <main className="page-main"><StatusPanel kind="error" title="Your cart is unavailable." description="Return to your cart and try again." action={<Link className="button button-secondary" href="/cart">Back to cart</Link>} /></main>;
  }
  const session = await getSession();
  const profile = session ? await optionalProfile() : undefined;
  const addresses = session ? await optionalAddresses() : [];

  return <main className="checkout-page"><CheckoutForm cart={result.cart} preview={result.preview} profile={profile} addresses={addresses} /></main>;
}
