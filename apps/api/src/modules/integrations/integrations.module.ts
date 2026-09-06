import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsPrismaRepository } from "./integrations.prisma-repository";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository";
import { IntegrationsService } from "./integrations.service";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrationsController, WebhookController],
  providers: [
    IntegrationsService,
    {
      provide: INTEGRATIONS_REPOSITORY,
      useClass: IntegrationsPrismaRepository,
    },
  ],
})
export class IntegrationsModule {}
