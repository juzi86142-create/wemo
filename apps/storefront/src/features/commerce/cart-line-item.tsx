"use client";

import type { CartItem } from "@wemo/contracts";

import { cartItemName, formatMoney } from "./cart-adapter";
import { QuantityControl } from "./quantity-control-view";

interface CartLineItemProps {
  item: CartItem;
  pending: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartLineItem({ item, pending, onQuantity, onRemove }: CartLineItemProps) {
  return <article className="cart-line"><div className={"cart-line-art product-art product-art-" + ((item.id % 3) + 1)}><span className="product-mark" aria-hidden="true">W</span></div><div className="cart-line-copy"><p className="eyebrow">WEMOVE SPORTS</p><h2>{cartItemName(item)}</h2><p>Variant {item.variant_id}</p><button className="text-button" type="button" onClick={onRemove} disabled={pending}>Remove</button></div><QuantityControl value={item.quantity} disabled={pending} onChange={onQuantity} /><strong className="cart-line-price">{formatMoney(item.line_total_minor, item.currency)}</strong></article>;
}
