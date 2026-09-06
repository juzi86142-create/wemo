import type { ReportKind, ReportSnapshot } from "@wemo/contracts/platform";

export const REPORTS_REPOSITORY = Symbol("REPORTS_REPOSITORY");

/** report_definitions 表已移除，保留最小结构用于类型收口。 */
export type ReportDefinition = {
  id: number;
  kind: ReportKind;
  name: string;
};

export interface ReportsRepository {
  listDefinitions(query: {
    page: number;
    page_size: number;
  }): Promise<{
    items: ReportDefinition[];
    total: number;
    page: number;
    page_size: number;
  }>;
  getDefinition(id: number): Promise<ReportDefinition | null>;
  runReport(
    id: number,
    params?: Record<string, unknown>,
  ): Promise<ReportSnapshot>;
  saveResult(result: unknown): Promise<{ id: number }>;
}
