import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuditModule } from "../audit/audit.module";
import { MediaController } from "./media.controller";
import { MediaPrismaRepository } from "./media.prisma-repository";
import { MEDIA_REPOSITORY } from "./media.repository";
import { MediaService } from "./media.service";

@Module({
  imports: [DatabaseModule, AuditModule],
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
