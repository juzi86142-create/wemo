import type { AnalyticsEvent, AnalyticsEventInput, AnalyticsQuery, AnalyticsSummary } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const ANALYTICS_REPOSITORY = Symbol("ANALYTICS_REPOSITORY");

export interface AnalyticsRepository {
  recordEvent(input: AnalyticsEventInput): Promise<AnalyticsEvent>;
  queryAnalytics(query: AnalyticsQuery): Promise<{ items: AnalyticsEvent[]; total: number }>;
  getSummary(query: AnalyticsQuery): Promise<AnalyticsSummary>;
}
