import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { PricingModule } from "../pricing/pricing.module";
import { CatalogController } from "./catalog.controller";
import { CatalogPrismaRepository } from "./catalog.prisma-repository";
import { CATALOG_REPOSITORY } from "./catalog.repository";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [DatabaseModule, PricingModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: CATALOG_REPOSITORY,
      useClass: CatalogPrismaRepository,
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
