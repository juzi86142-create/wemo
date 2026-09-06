import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [CommerceStateModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
