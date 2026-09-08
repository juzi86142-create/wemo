import { CartSchema, type Cart, type CartItem } from "@wemo/contracts";

import { ApiError } from "../platform/api-client";

let previewCart: Cart = {
  id: 501,
  user_id: null,
  company_id: null,
  channel: "guest",
  market: "global",
  currency: "USD",
  status: "active",
  items: [
    {
      id: 1,
      variant_id: 1001,
      quantity: 1,
      unit_price_minor: 3200,
      line_total_minor: 3200,
      currency: "USD",
      snapshot: { name: "Roll & Play Bowling Set", note: "7 piece set" },
      added_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: 2,
      variant_id: 1002,
      quantity: 1,
      unit_price_minor: 4400,
      line_total_minor: 4400,
      currency: "USD",
      snapshot: { name: "Steady Balance Board", note: "Indoor / outdoor" },
      added_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  subtotal_minor: 7600,
  total_minor: 7600,
  updated_at: "2026-01-01T00:00:00.000Z",
  expires_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const previewCartStorageKey = "wemo:preview-cart";

const previewVariantDetails: Record<number, { name: string; note: string; unitPriceMinor: number }> = {
  1001: { name: "Roll & Play Bowling Set", note: "7 piece set", unitPriceMinor: 3200 },
  1002: { name: "Steady Balance Board", note: "Indoor / outdoor", unitPriceMinor: 4400 },
  1003: { name: "Orbit Target Toss", note: "10 piece set", unitPriceMinor: 3800 },
};

export interface CartResult {
  cart: Cart | null;
  error: ApiError | undefined;
  preview: boolean;
}

export async function getCart(): Promise<CartResult> {
  return { cart: getPreviewCart(), error: undefined, preview: true };
}

export async function addCartItem(variantId: number, quantity: number) {
  if (quantity < 1) throw new ApiError("Quantity must be at least one.", 400);
  const cart = addPreviewCartItem(variantId, quantity);
  if (!cart) throw new ApiError("This demo product is unavailable.", 404);
  return cart;
}

export async function updateCartItem(item: CartItem, quantity: number) {
  if (quantity < 1) throw new ApiError("Quantity must be at least one.", 400);
  previewCart = replacePreviewQuantity(previewCart, item.id, quantity);
  return previewCart;
}

export async function removeCartItem(): Promise<never> {
  throw new ApiError("This cart service does not expose line removal yet.", 501);
}

export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function cartItemName(item: CartItem) {
  if (typeof item.snapshot === "object" && item.snapshot !== null && !Array.isArray(item.snapshot)) {
    const name = (item.snapshot as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) return name;
  }
  return "WEMOVE product";
}

export function replacePreviewQuantity(cart: Cart, itemId: number, quantity: number): Cart {
  const items = cart.items.map((item) =>
    item.id === itemId
      ? { ...item, quantity, line_total_minor: item.unit_price_minor * quantity }
      : item,
  );
  const subtotal = items.reduce((total, item) => total + item.line_total_minor, 0);
  return { ...cart, items, subtotal_minor: subtotal, total_minor: subtotal };
}

export function removePreviewItem(cart: Cart, itemId: number): Cart {
  const items = cart.items.filter((item) => item.id !== itemId);
  const subtotal = items.reduce((total, item) => total + item.line_total_minor, 0);
  return { ...cart, items, subtotal_minor: subtotal, total_minor: subtotal };
}

export function addPreviewCartItem(variantId: number, quantity: number) {
  previewCart = getPreviewCart();
  const item = previewCart.items.find((entry) => entry.variant_id === variantId);
  if (quantity < 1) return null;

  if (!item) {
    const details = previewVariantDetails[variantId];
    if (!details) return null;
    const nextId = Math.max(0, ...previewCart.items.map((entry) => entry.id)) + 1;
    const newItem: CartItem = {
      id: nextId,
      variant_id: variantId,
      quantity,
      unit_price_minor: details.unitPriceMinor,
      line_total_minor: details.unitPriceMinor * quantity,
      currency: previewCart.currency,
      snapshot: { name: details.name, note: details.note },
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const items = [...previewCart.items, newItem];
    const subtotal = items.reduce((total, entry) => total + entry.line_total_minor, 0);
    return setPreviewCart({ ...previewCart, items, subtotal_minor: subtotal, total_minor: subtotal, updated_at: new Date().toISOString() });
  }

  return setPreviewCart(replacePreviewQuantity(previewCart, item.id, item.quantity + quantity));
}

export function setPreviewCart(cart: Cart) {
  previewCart = CartSchema.parse(cart);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(previewCartStorageKey, JSON.stringify(previewCart));
    } catch {
      // Keep the in-memory cart usable when browser storage is unavailable.
    }
  }
  return previewCart;
}

export function getPreviewCart() {
  if (typeof window !== "undefined") {
    try {
      const storedCart = window.localStorage.getItem(previewCartStorageKey);
      if (storedCart) {
        const parsed = CartSchema.safeParse(JSON.parse(storedCart));
        if (parsed.success) previewCart = parsed.data;
      }
    } catch {
      // Ignore unavailable or malformed browser storage and keep the demo seed cart.
    }
  }
  return previewCart;
}
