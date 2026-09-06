import { Controller, Get, Inject, Query } from "@nestjs/common";

import { SearchService } from "./search.service";

@Controller()
export class SearchController {
  constructor(
    @Inject(SearchService)
    private readonly searchService: SearchService,
  ) {}

  @Get("search")
  search(@Query() query: unknown) {
    return this.searchService.search(query);
  }

  @Get("search/suggest")
  suggest(@Query() query: unknown) {
    return this.searchService.suggest(query);
  }
}
