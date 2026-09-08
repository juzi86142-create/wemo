"use client";

import { useState } from "react";
import type { Cart } from "@wemo/contracts";

import { ApiError } from "../platform/api-client";
import { ActionFeedback, type ActionFeedbackStatus } from "../platform";
import { CartLineItem } from "./cart-line-item";
import { CartSummary } from "./cart-summary";
import { getPreviewCart, removeCartItem, removePreviewItem, replacePreviewQuantity, setPreviewCart, updateCartItem } from "./cart-adapter";
import { getCartItemCount, notifyCartChange } from "./cart-count";
import { isContractMockMode } from "./contract-mock-mode";

export function CartView({ initialCart, preview }: { initialCart: Cart; preview: boolean }) {
  const [cart, setCart] = useState(() => preview ? getPreviewCart() : initialCart);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [actionStatus, setActionStatus] = useState<ActionFeedbackStatus>("idle");

  async function update(itemId: number, quantity: number) {
    const item = cart.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const previous = cart;
    setNotice(undefined);
    setActionStatus("pending");
    setPendingId(itemId);
    if (preview) {
      const nextCart = setPreviewCart(replacePreviewQuantity(cart, itemId, quantity));
      setCart(nextCart);
      notifyCartChange(nextCart);
    }
    try {
      if (!preview) {
        const nextCart = await updateCartItem(item, quantity);
        setCart(nextCart);
        notifyCartChange(nextCart);
      }
      setActionStatus("success");
    } catch (error) {
      setCart(previous);
      if (preview) notifyCartChange(previous);
      setNotice(error instanceof ApiError ? error.message : "The cart could not be updated.");
      setActionStatus("error");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(itemId: number) {
    const previous = cart;
    setNotice(undefined);
    setActionStatus("pending");
    setPendingId(itemId);
    if (preview) {
      const nextCart = setPreviewCart(removePreviewItem(cart, itemId));
      setCart(nextCart);
      notifyCartChange(nextCart);
    }
    try {
      if (!preview) await removeCartItem();
      if (!preview) {
        setCart(previous);
        setNotice("This cart service does not expose line removal yet.");
        setActionStatus("error");
      } else {
        setActionStatus("success");
      }
    } catch (error) {
      setCart(previous);
      if (preview) notifyCartChange(previous);
      setNotice(error instanceof ApiError ? error.message : "The cart could not be updated.");
      setActionStatus("error");
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) return <section className="empty-cart"><p className="eyebrow">YOUR CART</p><h1>Nothing here yet.</h1><p>Start with a little movement and build your own collection.</p><a className="button button-dark" href="/products">Explore products <span aria-hidden="true">↗</span></a></section>;

  const contractMock = isContractMockMode(process.env.NEXT_PUBLIC_WEMO_CONTRACT_MOCK);
  return <section className="cart-layout"><div className="cart-lines"><div className="cart-section-heading"><div><p className="eyebrow">YOUR CART</p><h1>Ready when you are.</h1></div><span>{getCartItemCount(cart)} items</span></div>{notice ? <p className="cart-notice" role="alert">{notice}</p> : null}<ActionFeedback status={actionStatus} idleMessage="Adjust quantities or remove an item when you are ready." pendingMessage="Updating your cart..." successMessage={preview ? "Preview cart updated locally." : "Cart updated."} errorMessage={notice ?? "The cart could not be updated."} />{preview ? <p className="preview-banner"><strong>Preview cart</strong><span>Line changes are local until the live cart service is connected.</span></p> : null}{!preview && contractMock ? <p className="contract-mock-banner" role="status">CONTRACT MOCK ONLY. No live order will be created.</p> : null}{cart.items.map((item) => <CartLineItem key={item.id} item={item} pending={pendingId === item.id} onQuantity={(quantity) => void update(item.id, quantity)} onRemove={() => void remove(item.id)} />)}</div><CartSummary cart={cart} preview={preview} /></section>;
}
