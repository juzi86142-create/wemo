import { Global, Module } from "@nestjs/common";

import { ExperienceStateModule } from "./experience-state.module";
import { CommerceStateStore } from "./commerce.state";

@Global()
@Module({
  imports: [ExperienceStateModule],
  providers: [CommerceStateStore],
  exports: [CommerceStateStore],
})
export class CommerceStateModule {}
