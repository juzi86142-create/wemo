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

  search(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    const result = this.repository.search(parsed);
    return SearchResponseSchema.parse(result);
  }

  suggest(query: unknown) {
    const parsed = parseInput(SearchQuerySchema, query);
    return SearchSuggestionResponseSchema.parse(this.repository.suggest(parsed.q));
  }
}
