import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
