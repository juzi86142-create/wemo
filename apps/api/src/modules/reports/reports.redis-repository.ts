import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";
import type { ReportKind, ReportSnapshot } from "@wemo/contracts/platform";
import { randomUUID } from "node:crypto";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  writeHashObject,
} from "../../runtime/redis-hash";
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
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  /** 分页列出报表定义 */
  async listDefinitions(query: { page: number; page_size: number }): Promise<{
    items: ReportDefinition[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const definitions = await this.loadDefinitions();
    return paginate(definitions, query);
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

    // 每次实时聚合真实数据 需求 18.2 六类运营报表
    const period = {
      from:
        typeof params?.from === "string"
          ? new Date(params.from)
          : new Date(0),
      to:
        typeof params?.to === "string" ? new Date(params.to) : new Date(),
    };
    const metrics = await this.computeMetrics(definition.kind, period);

    const snapshot: ReportSnapshot = {
      request_id: randomUUID(),
      kind: definition.kind,
      generated_at: new Date().toISOString(),
      ...(params?.from !== undefined || params?.to !== undefined
        ? {
            period: {
              from: period.from.toISOString(),
              to: period.to.toISOString(),
            },
          }
        : {}),
      metrics,
      series: [],
    };
    await writeHashObject(this.redis, RESULTS_KEY, id, snapshot);
    return snapshot;
  }

  /** 各报表真实聚合 数据来自 PostgreSQL 订单报价企业与 Redis 分析事件 */
  private async computeMetrics(
    kind: ReportKind,
    period: { from: Date; to: Date },
  ): Promise<ReportSnapshot["metrics"]> {
    const since = { gte: period.from, lte: period.to };
    const metrics: ReportSnapshot["metrics"] = [];
    const push = (key: string, label: string, value: number, unit = "次") =>
      metrics.push({ key, label, value, unit });

    if (kind === "dashboard") {
      const [orders, quotes, applications, forms] = await Promise.all([
        this.database.order.count({ where: { createdAt: since } }),
        this.database.quote.count({ where: { createdAt: since } }),
        this.database.dealerApplication.count({
          where: { createdAt: since },
        }),
        this.database.formSubmission.count({ where: { createdAt: since } }),
      ]);
      const pendingApplications = await this.database.dealerApplication.count({
        where: { status: "submitted" },
      });
      const pendingQuotes = await this.database.quote.count({
        where: { status: "requested" },
      });
      const pendingOrders = await this.database.order.count({
        where: { status: "pending_review" },
      });
      push("orders", "订单数", orders, "单");
      push("quotes", "报价请求", quotes, "单");
      push("applications", "经销商申请", applications, "单");
      push("forms", "联系表单", forms, "单");
      push("pending_applications", "待审核申请", pendingApplications, "单");
      push("pending_quotes", "待处理报价", pendingQuotes, "单");
      push("pending_orders", "待确认订单", pendingOrders, "单");
      return metrics;
    }

    if (kind === "sales") {
      const [orders, salesAgg, cancelled, refunded] = await Promise.all([
        this.database.order.count({ where: { createdAt: since } }),
        this.database.order.aggregate({
          where: { createdAt: since },
          _sum: { totalMinor: true },
        }),
        this.database.order.count({
          where: { createdAt: since, status: "cancelled" },
        }),
        this.database.order.count({
          where: { createdAt: since, status: "refunded" },
        }),
      ]);
      const b2bOrders = await this.database.order.count({
        where: { createdAt: since, channel: "b2b" },
      });
      const b2cOrders = await this.database.order.count({
        where: { createdAt: since, channel: "b2c" },
      });
      push("orders", "订单数", orders, "单");
      push("b2b_orders", "B2B 订单", b2bOrders, "单");
      push("b2c_orders", "B2C 订单", b2cOrders, "单");
      push("revenue_minor", "销售额", salesAgg._sum.totalMinor ?? 0, "分");
      push(
        "aov_minor",
        "客单价",
        orders > 0 ? Math.round((salesAgg._sum.totalMinor ?? 0) / orders) : 0,
        "分",
      );
      push("cancelled", "取消订单", cancelled, "单");
      push("refunded", "退款订单", refunded, "单");
      return metrics;
    }

    if (kind === "product") {
      const [products, activeProducts, variants, categories] =
        await Promise.all([
          this.database.product.count(),
          this.database.product.count({ where: { status: "active" } }),
          this.database.variant.count(),
          this.database.category.count(),
        ]);
      const stockAgg = await this.database.inventoryBalance.aggregate({
        _sum: { available: true, onHand: true },
      });
      push("products", "产品总数", products, "个");
      push("active_products", "在售产品", activeProducts, "个");
      push("variants", "变体总数", variants, "个");
      push("categories", "分类总数", categories, "个");
      push("on_hand", "在库总量", stockAgg._sum.onHand ?? 0, "件");
      push("available", "可售总量", stockAgg._sum.available ?? 0, "件");
      return metrics;
    }

    if (kind === "dealer") {
      const [companies, members, applications, approved] = await Promise.all([
        this.database.dealerCompany.count(),
        this.database.dealerMember.count({ where: { status: "active" } }),
        this.database.dealerApplication.count(),
        this.database.dealerApplication.count({ where: { status: "approved" } }),
      ]);
      push("companies", "经销商企业", companies, "家");
      push("members", "活跃成员", members, "人");
      push("applications", "申请总数", applications, "单");
      push("approved", "通过申请", approved, "单");
      push(
        "approval_rate",
        "通过率",
        applications > 0 ? Math.round((approved / applications) * 100) : 0,
        "%",
      );
      return metrics;
    }

    if (kind === "content") {
      const [entries, published, media, forms] = await Promise.all([
        this.database.contentEntry.count(),
        this.database.contentEntry.count({
          where: { status: { in: ["published", "scheduled"] } },
        }),
        this.database.mediaAsset.count(),
        this.database.formSubmission.count(),
      ]);
      push("entries", "内容条目", entries, "篇");
      push("published", "已发布内容", published, "篇");
      push("media", "媒体资产", media, "个");
      push("forms", "表单提交", forms, "单");
      return metrics;
    }

    if (kind === "search") {
      const events = await this.redis.lrange(
        `${REDIS_KEY_PREFIX}:analytics:events`,
        0,
        -1,
      );
      const searches = events
        .map((raw) => {
          try {
            return JSON.parse(raw) as { name?: string };
          } catch {
            return {};
          }
        })
        .filter((event) => event.name === "search").length;
      push("searches", "搜索次数", searches, "次");
      return metrics;
    }

    // lead
    const [leads, open] = await Promise.all([
      this.database.formSubmission.count({ where: { createdAt: since } }),
      this.database.formSubmission.count({
        where: {
          createdAt: since,
          status: { in: ["new", "assigned", "in_progress", "waiting_customer"] },
        },
      }),
    ]);
    push("leads", "线索总数", leads, "单");
    push("open_leads", "处理中线索", open, "单");
    return metrics;
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
    await writeHashObject(this.redis, RESULTS_KEY, id, record ?? {});
    return { id };
  }

  private async loadDefinitions(): Promise<ReportDefinition[]> {
    const existing = await readHashAll<ReportDefinition>(
      this.redis,
      DEFINITIONS_KEY,
      (raw) => JSON.parse(raw) as ReportDefinition,
    );
    if (existing.length === 0) {
      for (const definition of DEFAULT_DEFINITIONS) {
        await writeHashObject(
          this.redis,
          DEFINITIONS_KEY,
          definition.id,
          definition,
        );
      }
      return DEFAULT_DEFINITIONS;
    }
    return existing.sort((a, b) => a.id - b.id);
  }
}
