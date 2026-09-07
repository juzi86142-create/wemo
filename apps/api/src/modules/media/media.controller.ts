import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { MediaService } from "./media.service";

@Controller()
export class MediaController {
  constructor(
    @Inject(MediaService)
    private readonly mediaService: MediaService,
  ) {}

  @Get("media/assets")
  listAssets(@Query() query: unknown) {
    return this.mediaService.listAssets(query);
  }

  @Get("media/assets/:id")
  getAsset(@Param("id") id: string) {
    return this.mediaService.getAsset(id);
  }

  @Get("media/assets/:id/signed-url")
  getSignedUrl(@Param("id") id: string) {
    return this.mediaService.getSignedUrl(id);
  }

  @Get("admin/media/assets")
  listAdminAssets(@Query() query: unknown) {
    return this.mediaService.listAdminAssets(query);
  }

  @Post("admin/media/assets")
  @HttpCode(200)
  createAsset(@Body() body: unknown) {
    return this.mediaService.createAsset(body);
  }
}
