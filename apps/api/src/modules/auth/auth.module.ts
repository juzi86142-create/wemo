import { Module } from "@nestjs/common";

import { IdentityStateModule } from "../identity/identity-state.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [IdentityStateModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
