import { Module } from "@nestjs/common";

import { ExperienceStateModule } from "../../runtime/experience-state.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [ExperienceStateModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
