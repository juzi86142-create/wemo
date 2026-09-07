import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { PricingController } from "./pricing.controller";
import { PricingPrismaRepository } from "./pricing.prisma-repository";
import { PRICING_REPOSITORY } from "./pricing.repository";
import { PricingService } from "./pricing.service";
import {
  COUPON_REPOSITORY,
  CouponRedisRepository,
} from "./coupon.redis-repository";

@Module({
  imports: [DatabaseModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    {
      provide: PRICING_REPOSITORY,
      useClass: PricingPrismaRepository,
    },
    {
      provide: COUPON_REPOSITORY,
      useClass: CouponRedisRepository,
    },
  ],
  exports: [PricingService, PRICING_REPOSITORY, COUPON_REPOSITORY],
})
export class PricingModule {}
