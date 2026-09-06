import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { SettingsController } from "./settings.controller";
import { SettingsPrismaRepository } from "./settings.prisma-repository";
import { SETTINGS_REPOSITORY } from "./settings.repository";
import { SettingsService } from "./settings.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsPrismaRepository,
    },
  ],
})
export class SettingsModule {}
