import { AdminTable, AdminWorkspace, adminRecords } from "../../../../features/admin";

export default function AdminOrdersPage() {
  return <AdminWorkspace title="Orders in motion." description="Filter the local order queue and inspect fulfillment handoff details."><AdminTable title="Orders" rows={adminRecords.orders} /></AdminWorkspace>;
}
