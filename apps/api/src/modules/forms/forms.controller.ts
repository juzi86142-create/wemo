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

import { FormsService } from "./forms.service";

@Controller()
export class FormsController {
  constructor(
    @Inject(FormsService)
    private readonly formsService: FormsService,
  ) {}

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
