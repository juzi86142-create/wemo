import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { OrdersModule } from "../orders/orders.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsRedisRepository } from "./integrations.redis-repository";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository";
import { IntegrationsService } from "./integrations.service";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [IntegrationsController, WebhookController],
  providers: [
    IntegrationsService,
    {
      provide: INTEGRATIONS_REPOSITORY,
      useClass: IntegrationsRedisRepository,
    },
  ],
})
export class IntegrationsModule {}
