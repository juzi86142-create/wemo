import { Global, Module } from "@nestjs/common";

import { IdentityStateStore } from "./identity.state";

@Global()
@Module({
  providers: [IdentityStateStore],
  exports: [IdentityStateStore],
})
export class IdentityStateModule {}
