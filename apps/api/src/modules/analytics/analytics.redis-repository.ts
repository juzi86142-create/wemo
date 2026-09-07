import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import type {
  AnalyticsEventInput,
  AnalyticsEventRecord,
  RequestContext,
} from "@wemo/contracts/platform";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  ANALYTICS_REPOSITORY,
  type AnalyticsEventListQuery,
  type AnalyticsRepository,
} from "./analytics.repository";

const EVENTS_KEY = `${REDIS_KEY_PREFIX}:analytics:events`;
const DEDUPE_KEY = `${REDIS_KEY_PREFIX}:analytics:dedupe`;

/** 行为事件持久化在 Redis list 去重键按 dedupe_key 永久标记 */
@Injectable()
export class AnalyticsRedisRepository implements AnalyticsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 批量写入事件 按 dedupe_key 去重 返回接受数与去重数 */
  async recordEvents(
    events: AnalyticsEventInput[],
    context: RequestContext,
  ): Promise<{ accepted: AnalyticsEventRecord[]; deduplicated: number }> {
    const accepted: AnalyticsEventRecord[] = [];
    let deduplicated = 0;

    for (const input of events) {
      if (input.dedupe_key !== undefined) {
        const dedupeValue = await this.redis.get(
          `${DEDUPE_KEY}:${input.dedupe_key}`,
        );
        if (dedupeValue !== null) {
          deduplicated += 1;
          continue;
        }
        await this.redis.set(`${DEDUPE_KEY}:${input.dedupe_key}`, "1");
      }

      const record: AnalyticsEventRecord = {
        id: await this.redis.incr(`${REDIS_KEY_PREFIX}:analytics:next`),
        name: input.name,
        request_id: context.request_id,
        user_id: context.actor?.user_id ?? null,
        company_id: context.actor?.company_id ?? null,
        // 市场语言设备与角色是客户端上报的事件事实 来源就是事件输入本身
        market: input.market ?? null,
        locale: input.locale ?? null,
        device: input.device ?? null,
        role: input.role ?? null,
        payload: input.payload,
        dedupe_key: input.dedupe_key ?? null,
        occurred_at: new Date().toISOString(),
      };
      await this.redis.lpush(EVENTS_KEY, JSON.stringify(record));
      accepted.push(record);
    }

    return { accepted, deduplicated };
  }

  /** 按名称 请求号 企业 市场 语言过滤分页查询事件 */
  async queryAnalytics(query: AnalyticsEventListQuery): Promise<{
    items: AnalyticsEventRecord[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const raw = await this.redis.lrange(EVENTS_KEY, 0, -1);
    let records = raw.map((line) => JSON.parse(line) as AnalyticsEventRecord);

    if (query.name !== undefined)
      records = records.filter((r) => r.name === query.name);
    if (query.request_id !== undefined)
      records = records.filter((r) => r.request_id === query.request_id);
    if (query.company_id !== undefined)
      records = records.filter((r) => r.company_id === query.company_id);
    if (query.market !== undefined)
      records = records.filter((r) => r.market === query.market);
    if (query.locale !== undefined)
      records = records.filter((r) => r.locale === query.locale);

    const total = records.length;
    const start = (query.page - 1) * query.page_size;
    return {
      items: records.slice(start, start + query.page_size),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  /** 按事件名聚合计数 */
  async getSummary(query: AnalyticsEventListQuery): Promise<{
    events: { name: string; count: number }[];
    total: number;
  }> {
    const raw = await this.redis.lrange(EVENTS_KEY, 0, -1);
    let records = raw.map((line) => JSON.parse(line) as AnalyticsEventRecord);
    if (query.market !== undefined)
      records = records.filter((r) => r.market === query.market);
    if (query.locale !== undefined)
      records = records.filter((r) => r.locale === query.locale);

    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.name, (counts.get(record.name) ?? 0) + 1);
    }
    const events = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { events, total: records.length };
  }
}
