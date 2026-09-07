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

import { CmsService } from "./cms.service";

@Controller()
export class CmsController {
  constructor(
    @Inject(CmsService)
    private readonly cmsService: CmsService,
  ) {}

  @Get("cms/entries")
  listEntries(@Query() query: unknown) {
    return this.cmsService.listEntries(query);
  }

  @Get("cms/entries/:slug")
  getEntry(@Param("slug") slug: string) {
    return this.cmsService.getEntry(slug);
  }

  @Get("cms/navigation")
  listNavigation() {
    return this.cmsService.listNavigation();
  }

  @Get("admin/cms/entries")
  listAdminEntries(@Query() query: unknown) {
    return this.cmsService.listAdminEntries(query);
  }

  @Post("admin/cms/entries")
  @HttpCode(200)
  createEntry(@Body() body: unknown) {
    return this.cmsService.createEntry(body);
  }

  @Patch("admin/cms/entries/:id")
  @HttpCode(200)
  updateEntry(@Param("id") id: string, @Body() body: unknown) {
    return this.cmsService.updateEntry(id, body);
  }

  @Post("admin/cms/entries/:id/publish")
  @HttpCode(200)
  publishEntry(@Param("id") id: string, @Body() body: unknown) {
    return this.cmsService.publishEntry(id, body);
  }

  @Post("admin/cms/entries/:id/preview-token")
  @HttpCode(200)
  createPreviewToken(@Param("id") id: string) {
    return this.cmsService.createPreviewToken(id);
  }

  @Get("cms/preview/:token")
  previewEntry(@Param("token") token: string) {
    return this.cmsService.previewEntry(token);
  }

  @Get("admin/cms/entries/:id/versions")
  listVersions(@Param("id") id: string) {
    return this.cmsService.listVersions(id);
  }

  @Post("admin/cms/entries/:id/archive")
  @HttpCode(200)
  archiveEntry(@Param("id") id: string) {
    return this.cmsService.archiveEntry(id);
  }
}
