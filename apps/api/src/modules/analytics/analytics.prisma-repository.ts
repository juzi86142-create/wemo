import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from "./analytics.repository";
import type { AnalyticsEvent, AnalyticsEventInput, AnalyticsQuery, AnalyticsSummary } from "@wemo/contracts";

@Injectable()
export class AnalyticsPrismaRepository implements AnalyticsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async recordEvent(input: AnalyticsEventInput): Promise<AnalyticsEvent> {
    const event = await this.database.analyticsEvent.create({
      data: {
        name: input.name,
        properties: input.properties ?? {},
        userId: input.user_id,
        sessionId: input.session_id,
        market: input.market,
        locale: input.locale,
        url: input.url,
        userAgent: input.user_agent,
        ipAddress: input.ip_address,
      },
    });

    return {
      id: event.id,
      name: event.name,
      properties: event.properties,
      user_id: event.userId,
      session_id: event.sessionId,
      market: event.market,
      locale: event.locale,
      url: event.url,
      user_agent: event.userAgent,
      ip_address: event.ipAddress,
      created_at: event.createdAt.toISOString(),
    };
  }

  async queryAnalytics(query: AnalyticsQuery): Promise<{ items: AnalyticsEvent[]; total: number }> {
    const where: any = {};
    if (query.name) where.name = query.name;
    if (query.market) where.market = query.market;
    if (query.user_id) where.userId = query.user_id;
    if (query.start_date && query.end_date) {
      where.createdAt = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }

    const [events, total] = await Promise.all([
      this.database.analyticsEvent.findMany({
        where,
        skip: (query.page - 1) * (query.page_size || 20),
        take: query.page_size || 20,
        orderBy: { createdAt: "desc" },
      }),
      this.database.analyticsEvent.count({ where }),
    ]);

    return {
      items: events.map(e => ({
        id: e.id,
        name: e.name,
        properties: e.properties,
        user_id: e.userId,
        session_id: e.sessionId,
        market: e.market,
        locale: e.locale,
        url: e.url,
        user_agent: e.userAgent,
        ip_address: e.ipAddress,
        created_at: e.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getSummary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
    const result = await this.database.analyticsEvent.groupBy({
      by: ["name"],
      where: {
        AND: [
          query.market ? { market: query.market } : {},
          query.start_date && query.end_date
            ? { createdAt: { gte: new Date(query.start_date), lte: new Date(query.end_date) } }
            : {},
        ],
      },
      _count: { id: true },
    });

    return {
      events: result.map(r => ({
        name: r.name,
        count: r._count.id,
      })),
      total: result.reduce((sum, r) => sum + r._count.id, 0),
    };
  }
}
