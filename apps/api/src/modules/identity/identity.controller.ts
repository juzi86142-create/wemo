import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { IdentityService } from "./identity.service";

@Controller()
export class IdentityController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService,
  ) {}

  @Get("account/profile")
  getProfile() {
    return this.identityService.getProfile();
  }

  @Patch("account/profile")
  updateProfile(@Body() body: unknown) {
    return this.identityService.updateProfile(body);
  }

  @Get("account/addresses")
  listAddresses() {
    return this.identityService.listAddresses();
  }

  @Post("account/addresses")
  @HttpCode(200)
  createAddress(@Body() body: unknown) {
    return this.identityService.createAddress(body);
  }

  @Get("account/subscriptions")
  listSubscriptions() {
    return this.identityService.listSubscriptions();
  }

  @Post("account/subscriptions")
  @HttpCode(200)
  upsertSubscription(@Body() body: unknown) {
    return this.identityService.upsertSubscription(body);
  }

  @Get("account/data-requests")
  listDataRequests() {
    return this.identityService.listDataRequests();
  }

  @Post("account/data-requests")
  @HttpCode(200)
  createDataRequest(@Body() body: unknown) {
    return this.identityService.createDataRequest(body);
  }

  @Get("account/notifications")
  listNotifications(@Query() query: unknown) {
    return this.identityService.listNotifications(query);
  }

  @Get("admin/roles")
  listRoles() {
    return this.identityService.listRoles();
  }

  @Patch("admin/users/:id/permissions")
  updatePermissions(@Param("id") id: string, @Body() body: unknown) {
    return this.identityService.updatePermissions(id, body);
  }

  @Get("admin/notifications")
  listAdminNotifications(@Query() query: unknown) {
    return this.identityService.listAdminNotifications(query);
  }
}
