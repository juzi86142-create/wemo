import { Controller, Get, Inject, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { SearchService } from "./search.service";

@Controller()
export class SearchController {
  constructor(
    @Inject(SearchService)
    private readonly searchService: SearchService,
  ) {}

  /** 搜索接口每 IP 每分钟 60 次 */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get("search")
  search(@Query() query: unknown) {
    return this.searchService.search(query);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get("search/suggest")
  suggest(@Query() query: unknown) {
    return this.searchService.suggest(query);
  }
}
