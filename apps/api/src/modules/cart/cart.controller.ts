import { Body, Controller, Get, HttpCode, Inject, Post, Query } from "@nestjs/common";

import { CartService } from "./cart.service";

@Controller()
export class CartController {
  constructor(
    @Inject(CartService)
    private readonly cartService: CartService,
  ) {}

  @Get("cart")
  getCurrent(@Query() query: unknown) {
    return this.cartService.getCurrent(query);
  }

  @Post("cart/items")
  @HttpCode(200)
  addItem(@Body() body: unknown) {
    return this.cartService.addItem(body);
  }

  @Post("cart/merge")
  @HttpCode(200)
  merge(@Body() body: unknown) {
    return this.cartService.merge(body);
  }

  @Get("admin/carts")
  listCarts(@Query() query: unknown) {
    return this.cartService.listCarts(query);
  }
}
