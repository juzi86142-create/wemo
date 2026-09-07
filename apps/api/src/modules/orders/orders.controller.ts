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

import { OrdersService } from "./orders.service";

@Controller()
export class OrdersController {
  constructor(
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  @Get("orders")
  listOrders(@Query() query: unknown) {
    return this.ordersService.listOrders(query);
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.ordersService.getOrder(id);
  }

  @Post("orders")
  @HttpCode(200)
  createOrder(@Body() body: unknown) {
    return this.ordersService.createOrder(body);
  }

  @Patch("orders/:id/status")
  @HttpCode(200)
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    return this.ordersService.updateStatus(id, body);
  }

  @Get("admin/orders")
  listAdminOrders(@Query() query: unknown) {
    return this.ordersService.listOrders(query);
  }

  @Patch("admin/orders/:id/status")
  @HttpCode(200)
  updateAdminStatus(@Param("id") id: string, @Body() body: unknown) {
    return this.ordersService.updateStatus(id, body);
  }
}
