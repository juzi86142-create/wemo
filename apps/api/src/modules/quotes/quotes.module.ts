import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { QuotesController } from "./quotes.controller";
import { QuotesPrismaRepository } from "./quotes.prisma-repository";
import { QUOTES_REPOSITORY } from "./quotes.repository";
import { QuotesService } from "./quotes.service";

@Module({
  imports: [DatabaseModule, NotificationsModule, OrdersModule],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    {
      provide: QUOTES_REPOSITORY,
      useClass: QuotesPrismaRepository,
    },
  ],
})
export class QuotesModule {}
