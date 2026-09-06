import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { InventoryService } from "./inventory.service";

@Controller()
export class InventoryController {
  constructor(
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
  ) {}

  @Get("inventory/balances")
  listBalances(@Query() query: unknown) {
    return this.inventoryService.listBalances(query);
  }

  @Get("admin/inventory/balances")
  listAdminBalances(@Query() query: unknown) {
    return this.inventoryService.listBalances(query);
  }

  @Get("admin/inventory/reservations")
  listReservations(@Query() query: unknown) {
    return this.inventoryService.listReservations(query);
  }

  @Post("inventory/reservations")
  @HttpCode(200)
  reserve(@Body() body: unknown) {
    return this.inventoryService.reserve(body);
  }

  @Post("inventory/reservations/:id/confirm")
  @HttpCode(200)
  confirm(@Param("id") id: string, @Body() body: unknown) {
    return this.inventoryService.confirm(id, body);
  }

  @Post("inventory/reservations/:id/release")
  @HttpCode(200)
  release(@Param("id") id: string, @Body() body: unknown) {
    return this.inventoryService.release(id, body);
  }
}
