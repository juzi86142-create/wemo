import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { IdentityRepository } from "./identity.state";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [IdentityRepository],
  exports: [IdentityRepository],
})
export class IdentityStateModule {}

