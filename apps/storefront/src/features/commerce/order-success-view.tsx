"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Order } from "@wemo/contracts";

import { StatusPanel } from "../platform";
import { formatMoney } from "./cart-adapter";
import { consumeOrderSuccessSnapshot } from "./order-success-snapshot";

export function OrderSuccessView() {
  const [order, setOrder] = useState<Order | null>(null);
  const consumedSnapshot = useRef(false);

  useEffect(() => {
    if (consumedSnapshot.current) return;
    consumedSnapshot.current = true;
    setOrder(consumeOrderSuccessSnapshot());
  }, []);

  if (!order) {
    return <StatusPanel kind="empty" title="Your order details are not here." description="Return to the collection or check your account orders." action={<Link className="button button-dark" href="/products">Explore products</Link>} />;
  }

  return (
    <section className="order-success" aria-labelledby="order-success-title">
      <div className="order-success-heading">
        <p className="eyebrow">ORDER CONFIRMED</p>
        <h1 id="order-success-title">Ready for the next move.</h1>
        <p>Order {order.order_no} is {order.status.replaceAll("_", " ")}.</p>
      </div>
      <div className="order-success-panel">
        <div className="order-success-total"><span>Total</span><strong>{formatMoney(order.total_minor, order.currency)}</strong></div>
        <div className="order-success-lines">{order.items.map((item) => <div className="order-success-line" key={item.id}><span>{item.name_snapshot}</span><span>Qty {item.quantity}</span><strong>{formatMoney(item.total_minor, order.currency)}</strong></div>)}</div>
      </div>
      <div className="order-success-actions"><Link className="button button-dark" href="/products">Keep exploring <span aria-hidden="true">↗</span></Link><Link className="arrow-link" href="/account/orders">View account orders <span aria-hidden="true">↗</span></Link></div>
    </section>
  );
}
