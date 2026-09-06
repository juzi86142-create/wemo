import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { InventoryController } from "./inventory.controller";
import { InventoryPrismaRepository } from "./inventory.prisma-repository";
import { INVENTORY_REPOSITORY } from "./inventory.repository";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: InventoryPrismaRepository,
    },
  ],
})
export class InventoryModule {}
