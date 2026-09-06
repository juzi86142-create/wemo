import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { PricingModule } from "../pricing/pricing.module";
import { CartController } from "./cart.controller";
import { CartPrismaRepository } from "./cart.prisma-repository";
import { CART_REPOSITORY } from "./cart.repository";
import { CartService } from "./cart.service";

@Module({
  imports: [DatabaseModule, PricingModule],
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: CART_REPOSITORY,
      useClass: CartPrismaRepository,
    },
  ],
})
export class CartModule {}
