import type { AdminRecord } from "./admin-fixtures";

export interface AdminEditorState {
  title: string;
  summary: string;
}

export function getAdminEditorState(record: AdminRecord): AdminEditorState {
  return { title: record.title, summary: record.detail };
}
