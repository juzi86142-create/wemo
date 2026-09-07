import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [CommerceStateModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
