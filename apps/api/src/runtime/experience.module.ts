import { Global, Module } from "@nestjs/common";

import { ExperienceStateStore } from "./experience.state";

@Global()
@Module({
  providers: [ExperienceStateStore],
  exports: [ExperienceStateStore],
})
export class ExperienceModule {}
