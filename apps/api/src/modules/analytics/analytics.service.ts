import { Inject, Injectable } from "@nestjs/common";
import {
  AnalyticsEventBatchSchema,
  AnalyticsEventIngestResponseSchema,
  AnalyticsEventListQuerySchema,
  AnalyticsEventListResponseSchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  recordEvents(body: unknown) {
    const context = this.requestContext.requireContext();
    const parsed = parseInput(AnalyticsEventBatchSchema, body);
    const result = this.stateStore.recordAnalyticsEvents(
      parsed.events,
      context,
    );

    return AnalyticsEventIngestResponseSchema.parse({
      request_id: context.request_id,
      accepted: result.accepted.length,
      deduplicated: result.deduplicated,
      items: result.accepted,
    });
  }

  listEvents(query: unknown) {
    this.authorization.requireStaffPermission("analytics:read");
    const parsed = parseInput(AnalyticsEventListQuerySchema, query);
    return AnalyticsEventListResponseSchema.parse(
      this.stateStore.listAnalyticsEvents(parsed),
    );
  }
}
