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

  @Patch("account/addresses/:id")
  @HttpCode(200)
  updateAddress(@Param("id") id: string, @Body() body: unknown) {
    return this.identityService.updateAddress(id, body);
  }

  @Post("account/addresses/:id/delete")
  @HttpCode(200)
  deleteAddress(@Param("id") id: string) {
    return this.identityService.deleteAddress(id);
  }

  @Get("account/favorites")
  listFavorites() {
    return this.identityService.listFavorites();
  }

  @Post("account/favorites")
  @HttpCode(200)
  addFavorite(@Body() body: unknown) {
    return this.identityService.addFavorite(body);
  }

  @Post("account/favorites/remove")
  @HttpCode(200)
  removeFavorite(@Body() body: unknown) {
    return this.identityService.removeFavorite(body);
  }

  @Get("admin/users")
  listUsers(@Query() query: unknown) {
    return this.identityService.listUsers(query);
  }

  @Patch("admin/users/:id/status")
  @HttpCode(200)
  updateUserStatus(@Param("id") id: string, @Body() body: unknown) {
    return this.identityService.updateUserStatus(id, body);
  }

  @Post("admin/users/:id/roles")
  @HttpCode(200)
  assignRole(@Param("id") id: string, @Body() body: unknown) {
    return this.identityService.assignRole(id, body);
  }

  @Get("admin/data-requests")
  listAdminDataRequests() {
    return this.identityService.listAdminDataRequests();
  }

  @Patch("admin/data-requests/:id/status")
  @HttpCode(200)
  updateDataRequestStatus(@Param("id") id: string, @Body() body: unknown) {
    return this.identityService.updateDataRequestStatus(id, body);
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
