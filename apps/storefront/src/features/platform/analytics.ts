export const analyticsEvents = {
  pageView: "page_view",
  search: "search",
  productView: "product_view",
  addToCart: "add_to_cart",
  authResult: "auth_result",
  beginCheckout: "begin_checkout",
  checkoutSuccess: "checkout_success",
  checkoutFailure: "checkout_failure",
} as const;

export type AnalyticsEvent = (typeof analyticsEvents)[keyof typeof analyticsEvents];

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wemo:analytics", { detail: { event, properties } }));
}
