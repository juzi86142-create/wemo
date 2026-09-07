import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { ExperienceModule } from "./experience.module";
import { CommerceRepository } from "./commerce.state";

@Global()
@Module({
  imports: [DatabaseModule, ExperienceModule],
  providers: [CommerceRepository],
  exports: [CommerceRepository],
})
export class CommerceModule {}

