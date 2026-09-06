import { Inject, Injectable } from "@nestjs/common";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  SearchSuggestionResponseSchema,
} from "@wemo/contracts/content";

import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

@Injectable()
export class SearchService {
  constructor(
    @Inject(ExperienceStateStore)
    private readonly stateStore: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  search(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    const result = this.stateStore.search(parsed);
    const context = this.requestContext.requireContext();
    this.platformState.recordAnalyticsEvents(
      [
        {
          name: "search",
          payload: {
            query: parsed.q,
            results_count: result.total,
          },
          market: parsed.market ?? context.market,
          locale: parsed.locale ?? context.locale,
          role: context.actor?.audience ?? "guest",
          dedupe_key: `${context.request_id}:search:${parsed.q}`,
        },
      ],
      context,
    );
    return SearchResponseSchema.parse(result);
  }

  suggest(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    return SearchSuggestionResponseSchema.parse(this.stateStore.suggest(parsed));
  }
}
