"use client";

import { createElement, useEffect, useState } from "react";

import { getCart } from "./cart-adapter";

const cartChangeEvent = "wemo:cart-change";

export interface VisibleCart {
  items: Array<{ id: number; quantity: number }>;
}

export function getCartItemCount(cart: VisibleCart) {
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

export function notifyCartChange(cart: VisibleCart) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<VisibleCart>(cartChangeEvent, { detail: cart }));
}

export function useCartItemCount() {
  const [count, setCount] = useState<number | undefined>();

  useEffect(() => {
    let active = true;

    void getCart().then((result) => {
      if (active && result.cart) setCount(getCartItemCount(result.cart));
    });

    function updateCount(event: Event) {
      const cart = (event as CustomEvent<VisibleCart>).detail;
      if (cart) setCount(getCartItemCount(cart));
    }

    window.addEventListener(cartChangeEvent, updateCount);
    return () => {
      active = false;
      window.removeEventListener(cartChangeEvent, updateCount);
    };
  }, []);

  return count;
}

export function CartCount() {
  const count = useCartItemCount();
  return createElement("span", { "aria-live": "polite" }, count ?? "-");
}
