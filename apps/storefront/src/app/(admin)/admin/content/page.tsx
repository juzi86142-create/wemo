import { AdminTable, AdminWorkspace, adminRecords } from "../../../../features/admin";

export default function AdminContentPage() {
  return <AdminWorkspace title="Stories that get people moving." description="Review content status and preserve editorial input in the local demo editor."><AdminTable title="Content" rows={adminRecords.content} editorKind="content" /></AdminWorkspace>;
}
