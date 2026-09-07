import { Inject, Injectable } from "@nestjs/common";
import {
  AnalyticsEventBatchSchema,
  AnalyticsEventIngestResponseSchema,
  AnalyticsEventListQuerySchema,
  AnalyticsEventListResponseSchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { AnalyticsRedisRepository } from "./analytics.redis-repository";
import { ANALYTICS_REPOSITORY } from "./analytics.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly repository: AnalyticsRedisRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async recordEvents(body: unknown) {
    const context = this.requestContext.requireContext();
    const parsed = parseInput(AnalyticsEventBatchSchema, body);
    const result = await this.repository.recordEvents(parsed.events, context);

    return AnalyticsEventIngestResponseSchema.parse({
      request_id: context.request_id,
      accepted: result.accepted.length,
      deduplicated: result.deduplicated,
      items: result.accepted,
    });
  }

  async listEvents(query: unknown) {
    this.authorization.requireStaffPermission("analytics:read");
    const parsed = parseInput(AnalyticsEventListQuerySchema, query);
    return AnalyticsEventListResponseSchema.parse(
      await this.repository.queryAnalytics(parsed),
    );
  }
}
