import { Inject, Injectable } from "@nestjs/common";
import type { ReportSnapshot } from "@wemo/contracts/platform";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  type ReportDefinition,
  type ReportsRepository,
} from "./reports.repository";

const DEMO_REPORT_NOT_SUPPORTED = "Demo模式：暂不支持报表任务持久化";

/**
 * Demo 模式：report_definitions / report_results 表已从数据库中移除，
 * 定义列表返回空分页，报表生成/保存一律抛错。
 */
@Injectable()
export class ReportsPrismaRepository implements ReportsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listDefinitions(query: {
    page: number;
    page_size: number;
  }): Promise<{
    items: ReportDefinition[];
    total: number;
    page: number;
    page_size: number;
  }> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async getDefinition(id: number): Promise<ReportDefinition | null> {
    return null;
  }

  async runReport(
    id: number,
    params?: Record<string, unknown>,
  ): Promise<ReportSnapshot> {
    throw new Error(DEMO_REPORT_NOT_SUPPORTED);
  }

  async saveResult(result: unknown): Promise<{ id: number }> {
    throw new Error(DEMO_REPORT_NOT_SUPPORTED);
  }
}
