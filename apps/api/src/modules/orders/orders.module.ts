import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { PricingModule } from "../pricing/pricing.module";
import { OrdersController } from "./orders.controller";
import { OrdersPrismaRepository } from "./orders.prisma-repository";
import { ORDERS_REPOSITORY } from "./orders.repository";
import { OrdersService } from "./orders.service";

@Module({
  imports: [DatabaseModule, PricingModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDERS_REPOSITORY,
      useClass: OrdersPrismaRepository,
    },
  ],
})
export class OrdersModule {}
