import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { LocalizationService } from "./localization.service";

@Controller("localization")
export class LocalizationController {
  constructor(
    @Inject(LocalizationService)
    private readonly localizationService: LocalizationService,
  ) {}

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

  @Get("snapshot")
  snapshot(@Req() request: FastifyRequest) {
    return this.localizationService.snapshot(request.id);
  }
}
