import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { PricingController } from "./pricing.controller";
import { PricingPrismaRepository } from "./pricing.prisma-repository";
import { PRICING_REPOSITORY } from "./pricing.repository";
import { PricingService } from "./pricing.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    {
      provide: PRICING_REPOSITORY,
      useClass: PricingPrismaRepository,
    },
  ],
  exports: [PricingService, PRICING_REPOSITORY],
})
export class PricingModule {}
