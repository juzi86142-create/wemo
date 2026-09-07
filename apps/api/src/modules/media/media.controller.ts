import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

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

  @Get("downloads")
  listDownloads(@Query() query: unknown) {
    return this.mediaService.listDownloads(query);
  }

  @Get("dealer/downloads")
  listDealerDownloads(@Query() query: unknown) {
    return this.mediaService.listDealerDownloads(query);
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

  @Post("admin/media/upload")
  @HttpCode(200)
  uploadAsset(@Req() request: FastifyRequest) {
    return this.mediaService.uploadAsset(request);
  }
}
