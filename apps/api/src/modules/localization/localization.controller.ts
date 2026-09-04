import { Controller, Get, Query } from "@nestjs/common";
import {
  PaginationSchema,
  ResolveMarketContextQuerySchema,
} from "@wemo/contracts";

import { LocalizationService } from "./localization.service";

@Controller("localization")
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Get("languages")
  listLanguages(@Query() query: unknown) {
    return this.localizationService.listLanguages(
      PaginationSchema.parse(query),
    );
  }

  @Get("markets")
  listMarkets(@Query() query: unknown) {
    return this.localizationService.listMarkets(PaginationSchema.parse(query));
  }

  @Get("market-context")
  resolveMarketContext(@Query() query: unknown) {
    return this.localizationService.resolveMarketContext(
      ResolveMarketContextQuerySchema.parse(query),
    );
  }
}
