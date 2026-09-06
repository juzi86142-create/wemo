import type { ReportDefinition, ReportResult } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const REPORTS_REPOSITORY = Symbol("REPORTS_REPOSITORY");

export interface ReportsRepository {
  listDefinitions(query: any): Promise<{ items: ReportDefinition[]; total: number; page: number; page_size: number }>;
  getDefinition(id: number): Promise<ReportDefinition | null>;
  runReport(id: number, params?: Record<string, any>): Promise<ReportResult>;
  saveResult(result: any): Promise<{ id: number }>;
}
