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

import { PricingService } from "./pricing.service";

@Controller()
export class PricingController {
  constructor(
    @Inject(PricingService)
    private readonly pricingService: PricingService,
  ) {}

  @Get("pricing/preview")
  preview(@Query() query: unknown) {
    return this.pricingService.preview(query);
  }

  @Get("admin/pricing/records")
  listRecords(@Query() query: unknown) {
    return this.pricingService.listRecords(query);
  }

  @Post("admin/pricing/records")
  @HttpCode(200)
  createRecord(@Body() body: unknown) {
    return this.pricingService.createRecord(body);
  }

  @Patch("admin/pricing/records/:id")
  @HttpCode(200)
  updateRecord(@Param("id") id: string, @Body() body: unknown) {
    return this.pricingService.updateRecord(id, body);
  }
}
