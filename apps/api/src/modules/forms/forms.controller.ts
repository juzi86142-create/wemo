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
import { Throttle } from "@nestjs/throttler";

import { FormsService } from "./forms.service";

@Controller()
export class FormsController {
  constructor(
    @Inject(FormsService)
    private readonly formsService: FormsService,
  ) {}

  /** 联系表单每 IP 每分钟 10 次 兼作反垃圾基本防护 */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("forms/submissions")
  @HttpCode(200)
  submit(@Body() body: unknown) {
    return this.formsService.submit(body);
  }

  @Get("admin/forms/submissions")
  listSubmissions(@Query() query: unknown) {
    return this.formsService.listSubmissions(query);
  }

  @Patch("admin/forms/submissions/:id")
  @HttpCode(200)
  updateSubmission(@Param("id") id: string, @Body() body: unknown) {
    return this.formsService.updateSubmission(id, body);
  }
}
