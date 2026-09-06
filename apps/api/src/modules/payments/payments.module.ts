import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsPrismaRepository } from "./payments.prisma-repository";
import { PAYMENTS_REPOSITORY } from "./payments.repository";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENTS_REPOSITORY,
      useClass: PaymentsPrismaRepository,
    },
  ],
})
export class PaymentsModule {}
