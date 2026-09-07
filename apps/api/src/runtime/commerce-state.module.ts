import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { ExperienceStateModule } from "./experience-state.module";
import { CommerceRepository } from "./commerce.state";

@Global()
@Module({
  imports: [DatabaseModule, ExperienceStateModule],
  providers: [CommerceRepository],
  exports: [CommerceRepository],
})
export class CommerceStateModule {}

