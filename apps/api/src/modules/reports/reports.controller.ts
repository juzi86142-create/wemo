import { Controller, Get, Inject, Param, Query } from "@nestjs/common";

import { ReportsService } from "./reports.service";

@Controller("admin/reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
  ) {}

  @Get(":kind")
  getSnapshot(@Param("kind") kind: string, @Query() query: unknown) {
    return this.reportsService.getSnapshot(kind, query);
  }

  @Get(":kind/export")
  exportSnapshot(@Param("kind") kind: string, @Query() query: unknown) {
    return this.reportsService.exportSnapshot(kind, query);
  }
}
