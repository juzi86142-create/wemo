import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("admin/notifications/templates")
  listTemplates() {
    return this.notificationsService.listTemplates();
  }

  @Post("admin/notifications/templates")
  @HttpCode(200)
  createTemplate(@Body() body: unknown) {
    return this.notificationsService.upsertTemplate(undefined, body);
  }

  @Patch("admin/notifications/templates/:id")
  @HttpCode(200)
  updateTemplate(@Param("id") id: string, @Body() body: unknown) {
    return this.notificationsService.upsertTemplate(id, body);
  }

  @Get("admin/notifications/deliveries")
  listDeliveries(@Query() query: unknown) {
    return this.notificationsService.listDeliveries(query);
  }

  @Post("admin/notifications/deliveries")
  @HttpCode(200)
  createDelivery(@Body() body: unknown) {
    return this.notificationsService.createDelivery(body);
  }

  @Post("admin/notifications/deliveries/:id/retry")
  @HttpCode(200)
  retryDelivery(@Param("id") id: string, @Body() body: unknown) {
    return this.notificationsService.retryDelivery(id, body);
  }
}
