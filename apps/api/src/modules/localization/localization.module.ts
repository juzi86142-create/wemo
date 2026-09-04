import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { LocalizationController } from "./localization.controller";
import { LocalizationPrismaRepository } from "./localization.prisma-repository";
import { LOCALIZATION_REPOSITORY } from "./localization.repository";
import { LocalizationService } from "./localization.service";

@Module({
  imports: [DatabaseModule],
  controllers: [LocalizationController],
  providers: [
    LocalizationService,
    {
      provide: LOCALIZATION_REPOSITORY,
      useClass: LocalizationPrismaRepository,
    },
  ],
  exports: [LocalizationService],
})
export class LocalizationModule {}
