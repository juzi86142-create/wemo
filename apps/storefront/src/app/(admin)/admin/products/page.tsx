import { AdminTable, AdminWorkspace, adminRecords } from "../../../../features/admin";

export default function AdminProductsPage() {
  return <AdminWorkspace title="Products that move." description="Review product visibility, stock signals, and locally saved catalogue details."><AdminTable title="Products" rows={adminRecords.products} editorKind="product" /></AdminWorkspace>;
}
