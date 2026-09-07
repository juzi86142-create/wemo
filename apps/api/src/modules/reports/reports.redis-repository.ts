import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { ReportKind, ReportSnapshot } from "@wemo/contracts/platform";
import { randomUUID } from "node:crypto";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  REPORTS_REPOSITORY,
  type ReportDefinition,
  type ReportsRepository,
} from "./reports.repository";

const DEFINITIONS_KEY = `${REDIS_KEY_PREFIX}:reports:definitions`;
const RESULTS_KEY = `${REDIS_KEY_PREFIX}:reports:results`;

const DEFAULT_DEFINITIONS: ReportDefinition[] = [
  { id: 1, kind: "dashboard", name: "运营总览" },
  { id: 2, kind: "sales", name: "销售报表" },
  { id: 3, kind: "product", name: "商品报表" },
  { id: 4, kind: "dealer", name: "经销商报表" },
  { id: 5, kind: "content", name: "内容报表" },
  { id: 6, kind: "search", name: "搜索报表" },
  { id: 7, kind: "lead", name: "线索报表" },
];

/** 报表定义与结果持久化在 Redis 首次访问时写入默认七类报表 */
@Injectable()
export class ReportsRedisRepository implements ReportsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 分页列出报表定义 */
  async listDefinitions(query: { page: number; page_size: number }): Promise<{
    items: ReportDefinition[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const definitions = await this.loadDefinitions();
    const start = (query.page - 1) * query.page_size;
    return {
      items: definitions.slice(start, start + query.page_size),
      total: definitions.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  /** 按 id 查询报表定义 */
  async getDefinition(id: number): Promise<ReportDefinition | null> {
    const definitions = await this.loadDefinitions();
    return definitions.find((definition) => definition.id === id) ?? null;
  }

  /** 生成报表快照 已有结果直接返回 */
  async runReport(
    id: number,
    params?: Record<string, unknown>,
  ): Promise<ReportSnapshot> {
    const definition = await this.getDefinition(id);
    if (!definition) {
      throw new NotFoundException(`报表定义 ${id} 不存在`);
    }
    const existing = await this.redis.hget(RESULTS_KEY, String(id));
    if (existing) {
      return JSON.parse(existing) as ReportSnapshot;
    }

    const snapshot: ReportSnapshot = {
      request_id: randomUUID(),
      kind: definition.kind,
      generated_at: new Date().toISOString(),
      ...(params?.from !== undefined || params?.to !== undefined
        ? {
            period: {
              from: (params?.from as string) ?? new Date(0).toISOString(),
              to: (params?.to as string) ?? new Date().toISOString(),
            },
          }
        : {}),
      metrics: [{ key: "total", label: "总量", value: 0, unit: "次" }],
      series: [],
    };
    await this.redis.hset(RESULTS_KEY, String(id), JSON.stringify(snapshot));
    return snapshot;
  }

  /** 按报表类型执行报表 未匹配时回退总览报表 */
  async runReportByKind(
    kind: ReportKind,
    params?: Record<string, unknown>,
  ): Promise<ReportSnapshot> {
    const definitions = await this.loadDefinitions();
    const definition = definitions.find((d) => d.kind === kind);
    return this.runReport(definition?.id ?? 1, params);
  }

  /** 保存报表结果 */
  async saveResult(result: unknown): Promise<{ id: number }> {
    const record = result as {
      id?: number;
      definition_id?: number;
      data?: unknown;
    };
    const id =
      typeof record?.id === "number"
        ? record.id
        : typeof record?.definition_id === "number"
          ? record.definition_id
          : 1;
    await this.redis.hset(
      RESULTS_KEY,
      String(id),
      JSON.stringify(record ?? {}),
    );
    return { id };
  }

  private async loadDefinitions(): Promise<ReportDefinition[]> {
    const existing = await this.redis.hgetall(DEFINITIONS_KEY);
    if (Object.keys(existing).length === 0) {
      for (const definition of DEFAULT_DEFINITIONS) {
        await this.redis.hset(
          DEFINITIONS_KEY,
          String(definition.id),
          JSON.stringify(definition),
        );
      }
      return DEFAULT_DEFINITIONS;
    }
    return Object.entries(existing)
      .map(([, value]) => JSON.parse(value) as ReportDefinition)
      .sort((a, b) => a.id - b.id);
  }
}
