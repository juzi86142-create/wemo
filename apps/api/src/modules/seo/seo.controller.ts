import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";

import { SeoService } from "./seo.service";

@Controller()
export class SeoController {
  constructor(
    @Inject(SeoService)
    private readonly seoService: SeoService,
  ) {}

  @Get("seo/metadata")
  getMetadata(@Query() query: unknown) {
    return this.seoService.getMetadata(query);
  }

  @Get("seo/sitemap")
  getSitemap() {
    return this.seoService.getSitemap();
  }

  @Get("admin/seo/redirects")
  listRedirects() {
    return this.seoService.listRedirects();
  }

  @Post("admin/seo/redirects")
  @HttpCode(200)
  upsertRedirect(@Body() body: unknown) {
    return this.seoService.upsertRedirect(body);
  }
}
