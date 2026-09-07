import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DealersController } from "./dealers.controller";
import { DealersPrismaRepository } from "./dealers.prisma-repository";
import { DEALERS_REPOSITORY } from "./dealers.repository";
import { DealersService } from "./dealers.service";

@Module({
  imports: [DatabaseModule, NotificationsModule, AnalyticsModule],
  controllers: [DealersController],
  providers: [
    DealersService,
    {
      provide: DEALERS_REPOSITORY,
      useClass: DealersPrismaRepository,
    },
  ],
})
export class DealersModule {}
