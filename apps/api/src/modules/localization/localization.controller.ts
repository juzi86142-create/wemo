import { Controller, Get, Query } from "@nestjs/common";

import { LocalizationService } from "./localization.service";

@Controller("localization")
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Get("languages")
  listLanguages(@Query() query: unknown) {
    return this.localizationService.listLanguages(query);
  }

  @Get("markets")
  listMarkets(@Query() query: unknown) {
    return this.localizationService.listMarkets(query);
  }

  @Get("market-context")
  resolveMarketContext(@Query() query: unknown) {
    return this.localizationService.resolveMarketContext(query);
  }
}
