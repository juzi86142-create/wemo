import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
