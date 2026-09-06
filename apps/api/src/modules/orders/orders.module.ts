import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [CommerceStateModule, ExperienceStateModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
