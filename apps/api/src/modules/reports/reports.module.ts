import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ReportsController } from "./reports.controller";
import { ReportsPrismaRepository } from "./reports.prisma-repository";
import { REPORTS_REPOSITORY } from "./reports.repository";
import { ReportsService } from "./reports.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    {
      provide: REPORTS_REPOSITORY,
      useClass: ReportsPrismaRepository,
    },
  ],
})
export class ReportsModule {}
