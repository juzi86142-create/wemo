import type { ReportKind, ReportSnapshot } from "@wemo/contracts/platform";

export const REPORTS_REPOSITORY = Symbol("REPORTS_REPOSITORY");

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
  /** 按报表类型执行报表 未匹配时回退总览报表 */
  runReportByKind(
    kind: ReportKind,
    params?: Record<string, unknown>,
  ): Promise<ReportSnapshot>;
  saveResult(result: unknown): Promise<{ id: number }>;
}
