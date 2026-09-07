"use client";

import { useState } from "react";
import type { Cart } from "@wemo/contracts";

import { ApiError } from "../platform/api-client";
import { CartLineItem } from "./cart-line-item";
import { CartSummary } from "./cart-summary";
import { removeCartItem, removePreviewItem, replacePreviewQuantity, updateCartItem } from "./cart-adapter";
import { isContractMockMode } from "./contract-mock-mode";

export function CartView({ initialCart, preview }: { initialCart: Cart; preview: boolean }) {
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | undefined>();

  async function update(itemId: number, quantity: number) {
    const item = cart.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const previous = cart;
    setNotice(undefined);
    setPendingId(itemId);
    if (preview) setCart(replacePreviewQuantity(cart, itemId, quantity));
    try {
      if (!preview) setCart(await updateCartItem(item, quantity));
    } catch (error) {
      setCart(previous);
      setNotice(error instanceof ApiError ? error.message : "The cart could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(itemId: number) {
    const previous = cart;
    setNotice(undefined);
    setPendingId(itemId);
    if (preview) setCart(removePreviewItem(cart, itemId));
    try {
      if (!preview) await removeCartItem();
    } catch (error) {
      setCart(previous);
      setNotice(error instanceof ApiError ? error.message : "The cart could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) return <section className="empty-cart"><p className="eyebrow">YOUR CART</p><h1>Nothing here yet.</h1><p>Start with a little movement and build your own collection.</p><a className="button button-dark" href="/products">Explore products <span aria-hidden="true">↗</span></a></section>;

  const contractMock = isContractMockMode(process.env.NEXT_PUBLIC_WEMO_CONTRACT_MOCK);
  return <section className="cart-layout"><div className="cart-lines"><div className="cart-section-heading"><div><p className="eyebrow">YOUR CART</p><h1>Ready when you are.</h1></div><span>{cart.items.length} items</span></div>{notice ? <p className="cart-notice" role="alert">{notice}</p> : null}{preview ? <p className="preview-banner"><strong>Preview cart</strong><span>Line changes are local until the live cart service is connected.</span></p> : null}{!preview && contractMock ? <p className="contract-mock-banner" role="status">CONTRACT MOCK ONLY. No live order will be created.</p> : null}{cart.items.map((item) => <CartLineItem key={item.id} item={item} pending={pendingId === item.id} onQuantity={(quantity) => void update(item.id, quantity)} onRemove={() => void remove(item.id)} />)}</div><CartSummary cart={cart} preview={preview} /></section>;
}
