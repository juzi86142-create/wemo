"use client";

import Link from "next/link";

import { analyticsEvents, trackEvent } from "../platform/analytics";

export function CheckoutLink({ itemCount, preview = false }: { itemCount: number; preview?: boolean }) {
  return <Link className="button button-dark" href="/checkout" onClick={() => trackEvent(analyticsEvents.beginCheckout, { item_count: itemCount, preview: preview ? 1 : 0 })}>Continue to checkout <span aria-hidden="true">↗</span></Link>;
}
