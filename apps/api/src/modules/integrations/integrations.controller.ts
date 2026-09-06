import { Controller, Get, Inject, Query } from "@nestjs/common";

import { IntegrationsService } from "./integrations.service";

@Controller("admin/integrations")
export class IntegrationsController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  listIntegrations() {
    return this.integrationsService.listIntegrations();
  }

  @Get("deliveries")
  listDeliveries(@Query() query: unknown) {
    return this.integrationsService.listDeliveries(query);
  }
}
