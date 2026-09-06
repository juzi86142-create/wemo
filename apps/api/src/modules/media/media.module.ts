import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { MediaController } from "./media.controller";
import { MediaPrismaRepository } from "./media.prisma-repository";
import { MEDIA_REPOSITORY } from "./media.repository";
import { MediaService } from "./media.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: MEDIA_REPOSITORY,
      useClass: MediaPrismaRepository,
    },
  ],
})
export class MediaModule {}
