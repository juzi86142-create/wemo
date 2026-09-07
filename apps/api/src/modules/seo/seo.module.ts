import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
