import { AdminTable, AdminWorkspace, adminRecords } from "../../../../features/admin";

export default function AdminDealersPage() {
  return <AdminWorkspace title="Partners who play." description="Keep the dealer review queue focused with local demo application records."><AdminTable title="Dealers" rows={adminRecords.dealers} /></AdminWorkspace>;
}
