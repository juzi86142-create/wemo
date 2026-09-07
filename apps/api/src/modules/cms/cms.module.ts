import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { CmsController } from "./cms.controller";
import { CmsService } from "./cms.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
