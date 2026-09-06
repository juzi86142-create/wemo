import type { AuditLog, AuditLogQuery, JsonValue } from "@wemo/contracts";

export const AUDIT_REPOSITORY = Symbol("AUDIT_REPOSITORY");

/** 追加审计日志的入参（audit_logs 行映射） */
export type AuditLogRecordInput = {
  actor_id: number | null;
  action: string;
  entity: string;
  entity_id: number;
  before?: JsonValue | null;
  after?: JsonValue | null;
  ip?: string | null;
  request_id: string;
};

export type AuditLogPage = {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
};

export interface AuditRepository {
  recordLog(input: AuditLogRecordInput): Promise<AuditLog>;
  queryEntries(query: AuditLogQuery): Promise<AuditLogPage>;
}
