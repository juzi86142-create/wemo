import Link from "next/link";

import { getAccountOrder } from "../../../../../features/account";
import { StatusPanel } from "../../../../../features/platform";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { item } = await getAccountOrder(id);
    return <main className="account-page"><div className="account-heading"><p className="eyebrow">ORDER {item.order_no}</p><h1>{item.status.replaceAll("_", " ")}</h1><p>Placed {new Date(item.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}.</p></div><div className="order-detail-panel"><div className="order-detail-total"><span>Total</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(item.total_minor / 100)}</strong></div>{item.items.map((line) => <div className="order-line" key={line.id}><span>{line.name_snapshot}</span><span>Qty {line.quantity}</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(line.total_minor / 100)}</strong></div>)}</div><Link className="arrow-link" href="/account/orders">Back to orders <span aria-hidden="true">↗</span></Link></main>;
  } catch { return <main className="account-page"><StatusPanel kind="error" title="Order unavailable." description="We could not load that order, or it does not belong to this account." action={<Link className="button button-secondary" href="/account/orders">Back to orders</Link>} /></main>; }
}
