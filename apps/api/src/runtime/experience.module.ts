import { Global, Module } from "@nestjs/common";

import { ExperienceRepository } from "./experience.state";

@Global()
@Module({
  providers: [ExperienceRepository],
  exports: [ExperienceRepository],
})
export class ExperienceModule {}

