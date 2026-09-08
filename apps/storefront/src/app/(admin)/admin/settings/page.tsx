import { AdminSettingsPanel, AdminWorkspace } from "../../../../features/admin";

export default function AdminSettingsPage() {
  return <AdminWorkspace title="Set the working rhythm." description="Manage the local profile, role context, market, and audit preferences."><AdminSettingsPanel /></AdminWorkspace>;
}
