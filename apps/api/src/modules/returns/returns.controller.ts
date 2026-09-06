import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";

import { ReturnsService } from "./returns.service";

@Controller()
export class ReturnsController {
  constructor(
    @Inject(ReturnsService)
    private readonly returnsService: ReturnsService,
  ) {}

  @Get("returns")
  listReturns(@Query() query: unknown) {
    return this.returnsService.listReturns(query);
  }

  @Post("returns")
  @HttpCode(200)
  createReturn(@Body() body: unknown) {
    return this.returnsService.createReturn(body);
  }

  @Post("admin/returns/:id/review")
  @HttpCode(200)
  reviewReturn(@Param("id") id: string, @Body() body: unknown) {
    return this.returnsService.reviewReturn(id, body);
  }
}
