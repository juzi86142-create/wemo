"use client";

import { useState } from "react";

import { ActionFeedback, type ActionFeedbackStatus } from "../platform";
import { addCartItem, addPreviewCartItem } from "./cart-adapter";
import { notifyCartChange } from "./cart-count";

export function AddToCartButton({ variantId, preview }: { variantId: number | undefined; preview: boolean }) {
  const [status, setStatus] = useState<ActionFeedbackStatus>("idle");

  async function addToCart() {
    if (!variantId) {
      setStatus("error");
      return;
    }

    setStatus("pending");
    try {
      const cart = preview ? addPreviewCartItem(variantId, 1) : await addCartItem(variantId, 1);
      if (!cart) {
        setStatus("error");
        return;
      }
      notifyCartChange(cart);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="add-to-cart-action">
      <button className="button button-dark add-button" type="button" disabled={status === "pending"} onClick={() => void addToCart()}>
        {status === "pending" ? "Adding to cart..." : "Add to cart"} <span aria-hidden="true">+</span>
      </button>
      <ActionFeedback
        status={status}
        idleMessage={preview ? "Preview cart changes stay in this browser." : "Cart availability is confirmed by the live service."}
        pendingMessage="Adding this item to your cart..."
        successMessage={preview ? "Added to the preview cart. No live cart was changed." : "Added to your cart."}
        errorMessage={
          !variantId
            ? "This product has no purchasable variant yet."
            : preview
              ? "This preview product has no local price record. Connect the live cart service to add it."
              : "The cart service is unavailable. Your cart was not changed."
        }
      />
    </div>
  );
}
