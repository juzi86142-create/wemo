import { Module } from "@nestjs/common";

import { IdentityStateModule } from "../identity/identity-state.module";
import { DealersController } from "./dealers.controller";
import { DealersService } from "./dealers.service";

@Module({
  imports: [IdentityStateModule],
  controllers: [DealersController],
  providers: [DealersService],
})
export class DealersModule {}
