import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";

import { PaymentsService } from "./payments.service";

@Controller()
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get("admin/payments")
  listPayments(@Query() query: unknown) {
    return this.paymentsService.listPayments(query);
  }

  @Post("payments")
  @HttpCode(200)
  createPayment(@Body() body: unknown) {
    return this.paymentsService.createPayment(body);
  }

  @Post("payments/:id/capture")
  @HttpCode(200)
  capturePayment(@Param("id") id: string, @Body() body: unknown) {
    return this.paymentsService.capturePayment(id, body);
  }

  @Post("payments/:id/refund")
  @HttpCode(200)
  refundPayment(@Param("id") id: string, @Body() body: unknown) {
    return this.paymentsService.refundPayment(id, body);
  }
}
