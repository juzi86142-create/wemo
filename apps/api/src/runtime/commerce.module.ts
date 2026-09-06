import { Global, Module } from "@nestjs/common";

import { ExperienceModule } from "./experience.module";
import { CommerceStateStore } from "./commerce.state";

@Global()
@Module({
  imports: [ExperienceModule],
  providers: [CommerceStateStore],
  exports: [CommerceStateStore],
})
export class CommerceModule {}
