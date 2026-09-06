import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";

@Module({
  imports: [CommerceStateModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
