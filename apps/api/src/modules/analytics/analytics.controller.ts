import { Body, Controller, Get, HttpCode, Inject, Post, Query } from "@nestjs/common";

import { AnalyticsService } from "./analytics.service";

@Controller()
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post("analytics/events")
  @HttpCode(200)
  recordEvents(@Body() body: unknown) {
    return this.analyticsService.recordEvents(body);
  }

  @Get("admin/analytics/events")
  listEvents(@Query() query: unknown) {
    return this.analyticsService.listEvents(query);
  }
}
