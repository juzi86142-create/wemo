import { z } from "zod";
import {
  AnalyticsEventListQuerySchema,
  type AnalyticsEventInput,
  type AnalyticsEventRecord,
  type RequestContext,
} from "@wemo/contracts/platform";

export const ANALYTICS_REPOSITORY = Symbol("ANALYTICS_REPOSITORY");

/** AnalyticsEventListQuerySchema 的输出形状（platform 契约未导出对应 type）。 */
export type AnalyticsEventListQuery = z.infer<
  typeof AnalyticsEventListQuerySchema
>;

export interface AnalyticsRepository {
  recordEvents(
    events: AnalyticsEventInput[],
    context: RequestContext,
  ): Promise<{ accepted: AnalyticsEventRecord[]; deduplicated: number }>;
  queryAnalytics(
    query: AnalyticsEventListQuery,
  ): Promise<{
    items: AnalyticsEventRecord[];
    total: number;
    page: number;
    page_size: number;
  }>;
  getSummary(
    query: AnalyticsEventListQuery,
  ): Promise<{ events: { name: string; count: number }[]; total: number }>;
}
