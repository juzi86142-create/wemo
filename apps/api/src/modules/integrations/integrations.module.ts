import { Module } from "@nestjs/common";

import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { WebhookController } from "./webhook.controller";

@Module({
  controllers: [IntegrationsController, WebhookController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
