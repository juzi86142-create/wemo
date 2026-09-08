import Link from "next/link";

import { DealerWorkspace, dealerMetrics, dealerOrders, dealerQuotes } from "../../../features/dealer";

export default function DealerOverviewPage() {
  return <DealerWorkspace title="Keep every good idea moving." description="Your local dealer view for the next order, quote, and company decision.">
    <section className="dealer-metric-grid" aria-label="Dealer account metrics">{dealerMetrics.map((metric) => <article className={`dealer-metric dealer-metric-${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p></article>)}</section>
    <section className="dealer-dashboard-grid"><article className="dealer-workspace-panel"><div className="dealer-panel-heading"><div><p className="eyebrow">RECENT ORDERS</p><h2>What is moving</h2></div><Link className="arrow-link" href="/dealer/orders">All orders <span>↗</span></Link></div><div className="dealer-activity-list">{dealerOrders.map((order) => <div key={order.id}><span>{order.id}</span><strong>{order.title}</strong><p>{order.detail}</p><em>{order.status}</em></div>)}</div></article><article className="dealer-workspace-panel"><p className="eyebrow">QUICK LINKS</p><h2>Get back to play</h2><div className="dealer-link-list"><Link href="/dealer/quick-order">Build a quick order <span>↗</span></Link><Link href="/dealer/catalog">Browse catalog <span>↗</span></Link><Link href="/dealer/quotes">Review {dealerQuotes.length} quotes <span>↗</span></Link></div></article></section>
  </DealerWorkspace>;
}
