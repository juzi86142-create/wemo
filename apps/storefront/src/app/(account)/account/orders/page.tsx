import Link from "next/link";

import { getAccountOrders, getSession } from "../../../../features/account";
import { StatusPanel } from "../../../../features/platform";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) return <main className="account-page"><StatusPanel kind="forbidden" title="Sign in to see your orders." description="Your order history is private to your account." action={<Link className="button button-dark" href="/login">Sign in</Link>} /></main>;
  try {
    const response = await getAccountOrders({ page: 1, page_size: 20 });
    return <main className="account-page"><div className="account-heading"><p className="eyebrow">ORDER HISTORY</p><h1>Your orders.</h1><p>Every order, one place.</p></div>{response.items.length === 0 ? <StatusPanel kind="empty" title="No orders yet." description="Your next good idea could start with the collection." action={<Link className="button button-dark" href="/products">Explore products</Link>} /> : <div className="order-list">{response.items.map((order) => <Link className="order-row" href={"/account/orders/" + order.id} key={order.id}><span>{order.order_no}</span><strong>{order.status.replaceAll("_", " ")}</strong><span>{new Date(order.created_at).toLocaleDateString("en-US")}</span><b>↗</b></Link>)}</div>}</main>;
  } catch { return <main className="account-page"><StatusPanel kind="error" title="Orders unavailable." description="We could not load your order history right now." action={<Link className="button button-secondary" href="/account/orders">Try again</Link>} /></main>; }
}
