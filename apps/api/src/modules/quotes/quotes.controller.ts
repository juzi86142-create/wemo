import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";

import { QuotesService } from "./quotes.service";

@Controller()
export class QuotesController {
  constructor(
    @Inject(QuotesService)
    private readonly quotesService: QuotesService,
  ) {}

  @Get("quotes")
  listQuotes(@Query() query: unknown) {
    return this.quotesService.listQuotes(query);
  }

  @Post("quotes")
  @HttpCode(200)
  createQuote(@Body() body: unknown) {
    return this.quotesService.createQuote(body);
  }

  @Get("quotes/:id/versions")
  listVersions(@Param("id") id: string) {
    return this.quotesService.listVersions(id);
  }

  @Post("quotes/:id/review")
  @HttpCode(200)
  reviewQuote(@Param("id") id: string, @Body() body: unknown) {
    return this.quotesService.reviewQuote(id, body);
  }

  @Post("quotes/:id/convert")
  @HttpCode(200)
  convertQuote(@Param("id") id: string, @Body() body: unknown) {
    return this.quotesService.convertQuote(id, body);
  }
}
