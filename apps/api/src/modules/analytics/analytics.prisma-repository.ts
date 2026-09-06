import { Inject, Injectable } from "@nestjs/common";
import type {
  AnalyticsEventInput,
  AnalyticsEventRecord,
  RequestContext,
} from "@wemo/contracts/platform";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  ANALYTICS_REPOSITORY,
  type AnalyticsEventListQuery,
  type AnalyticsRepository,
} from "./analytics.repository";

/**
 * Demo 模式：analytics_events 表已从数据库中移除，
 * recordEvent 直接成功并返回合成事件记录，不做任何持久化。
 */
@Injectable()
export class AnalyticsPrismaRepository implements AnalyticsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async recordEvents(
    events: AnalyticsEventInput[],
    context: RequestContext,
  ): Promise<{ accepted: AnalyticsEventRecord[]; deduplicated: number }> {
    console.log(
      `[analytics:demo] recordEvents 忽略持久化，共 ${events.length} 条事件`,
      { request_id: context.request_id },
    );

    const accepted: AnalyticsEventRecord[] = events.map((event, index) => ({
      id: Date.now() + index,
      name: event.name,
      request_id: context.request_id,
      user_id: context.actor?.user_id ?? null,
      company_id: context.actor?.company_id ?? null,
      market: event.market ?? context.market ?? null,
      locale: event.locale ?? context.locale ?? null,
      device: event.device ?? null,
      role: event.role ?? context.actor?.audience ?? null,
      payload: event.payload,
      dedupe_key: event.dedupe_key ?? null,
      occurred_at: new Date().toISOString(),
    }));

    return { accepted, deduplicated: 0 };
  }

  async queryAnalytics(
    query: AnalyticsEventListQuery,
  ): Promise<{
    items: AnalyticsEventRecord[];
    total: number;
    page: number;
    page_size: number;
  }> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async getSummary(
    query: AnalyticsEventListQuery,
  ): Promise<{ events: { name: string; count: number }[]; total: number }> {
    return { events: [], total: 0 };
  }
}
