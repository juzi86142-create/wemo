import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
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

  /** 语言与市场管理 需求 12.1 仅本地化配置权限员工 */
  @Post("admin/languages")
  @HttpCode(200)
  upsertLanguage(@Body() body: unknown) {
    return this.localizationService.adminUpsertLanguage(body);
  }

  @Patch("admin/languages/:code")
  @HttpCode(200)
  updateLanguage(@Param("code") code: string, @Body() body: unknown) {
    return this.localizationService.adminUpsertLanguage({ ...(body as object), code });
  }

  @Post("admin/markets")
  @HttpCode(200)
  saveMarket(@Body() body: unknown) {
    return this.localizationService.adminSaveMarket(body);
  }

  @Patch("admin/markets/:code")
  @HttpCode(200)
  updateMarket(@Param("code") code: string, @Body() body: unknown) {
    return this.localizationService.adminSaveMarket({ ...(body as object), code });
  }
}
