import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";

import { IntegrationsService } from "./integrations.service";

@Controller("integrations")
export class WebhookController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Post("webhooks/:provider")
  @HttpCode(200)
  ingestWebhook(
    @Param("provider") provider: string,
    @Body() body: unknown,
    @Headers("x-wemo-signature") signature?: string,
  ) {
    return this.integrationsService.ingestWebhook(
      provider,
      body,
      signature ?? null,
    );
  }
}
