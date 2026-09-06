import type { AuditEntry, AuditEntryCreateInput, AuditEntryQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const AUDIT_REPOSITORY = Symbol("AUDIT_REPOSITORY");

export interface AuditRepository {
  logEntry(input: AuditEntryCreateInput): Promise<AuditEntry>;
  queryEntries(query: AuditEntryQuery): Promise<{ items: AuditEntry[]; total: number }>;
}
