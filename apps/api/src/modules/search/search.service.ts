import { Inject, Injectable } from "@nestjs/common";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  SearchSuggestionResponseSchema,
} from "@wemo/contracts/content";

import { SearchPrismaRepository } from "./search.prisma-repository";
import { SEARCH_REPOSITORY } from "./search.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY)
    private readonly repository: SearchPrismaRepository,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async search(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    const context = this.requestContext.requireContext();
    const result = await this.repository.search({
      q: parsed.q,
      page: parsed.page,
      page_size: parsed.page_size,
      ...(parsed.type !== undefined ? { type: parsed.type } : {}),
      market: context.market,
      locale: context.locale,
    });
    return SearchResponseSchema.parse(result);
  }

  async suggest(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    const context = this.requestContext.requireContext();
    const suggestions = await this.repository.suggest(parsed.q, context.locale);
    return SearchSuggestionResponseSchema.parse({
      q: parsed.q,
      suggestions,
    });
  }
}
