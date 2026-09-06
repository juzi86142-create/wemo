import { Module } from "@nestjs/common";

import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { IdentityStateModule } from "./identity-state.module";

@Module({
  imports: [IdentityStateModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
