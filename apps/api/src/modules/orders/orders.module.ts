import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuditModule } from "../audit/audit.module";
import { OrdersController } from "./orders.controller";
import { OrdersPrismaRepository } from "./orders.prisma-repository";
import { ORDERS_REPOSITORY } from "./orders.repository";
import { OrdersService } from "./orders.service";

@Module({
  imports: [DatabaseModule, NotificationsModule, PricingModule, AuditModule, AnalyticsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDERS_REPOSITORY,
      useClass: OrdersPrismaRepository,
    },
  ],
  exports: [ORDERS_REPOSITORY],
})
export class OrdersModule {}
