import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [CommerceStateModule],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
