import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsPrismaRepository } from "./analytics.prisma-repository";
import { ANALYTICS_REPOSITORY } from "./analytics.repository";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    {
      provide: ANALYTICS_REPOSITORY,
      useClass: AnalyticsPrismaRepository,
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
