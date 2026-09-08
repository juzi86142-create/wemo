import Link from "next/link";

import { AdminWorkspace, adminAlerts, adminMetrics, adminRecords } from "../../../features/admin";

export default function AdminDashboardPage() {
  return <AdminWorkspace title="A clear view of play." description="Operational signals, recent activity, and the next few decisions in one local demo workspace.">
    <section className="admin-metric-grid" aria-label="Dashboard metrics">{adminMetrics.map((metric) => <article className={`admin-metric admin-metric-${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p></article>)}</section>
    <section className="admin-dashboard-grid">
      <article className="admin-workspace-panel"><div className="admin-panel-heading"><div><p className="eyebrow">RECENT ORDERS</p><h2>Latest movement</h2></div><Link className="arrow-link" href="/admin/orders">All orders <span>↗</span></Link></div><div className="admin-activity-list">{adminRecords.orders.map((order) => <div key={order.id}><span>{order.id}</span><strong>{order.title}</strong><p>{order.meta}</p><em>{order.status}</em></div>)}</div></article>
      <article className="admin-workspace-panel"><p className="eyebrow">ATTENTION</p><h2>Action queue</h2><div className="admin-alert-list">{adminAlerts.map((alert) => <Link href={alert.href} key={alert.title}><strong>{alert.title}</strong><span>{alert.detail}</span><b>↗</b></Link>)}</div></article>
    </section>
    <section className="admin-quick-links" aria-label="Quick links"><Link href="/admin/products">Manage products <span>↗</span></Link><Link href="/admin/dealers">Review dealers <span>↗</span></Link><Link href="/admin/content">Edit content <span>↗</span></Link></section>
  </AdminWorkspace>;
}
