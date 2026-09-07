import { Inject, Injectable } from "@nestjs/common";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  SearchSuggestionResponseSchema,
} from "@wemo/contracts/content";

import { ExperienceRepository } from "../../runtime/experience.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

@Injectable()
export class SearchService {
  constructor(
    @Inject(ExperienceRepository)
    private readonly stateStore: ExperienceRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async search(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    const result = await this.stateStore.search(parsed);
    const context = this.requestContext.requireContext();
    await this.platformState.recordAnalyticsEvents(
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

  async suggest(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    return SearchSuggestionResponseSchema.parse(await this.stateStore.suggest(parsed));
  }
}

