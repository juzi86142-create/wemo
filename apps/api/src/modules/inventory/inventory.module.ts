import { Module } from "@nestjs/common";

import { CommerceStateModule } from "../../runtime/commerce-state.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [CommerceStateModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
