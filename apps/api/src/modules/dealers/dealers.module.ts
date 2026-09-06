import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { DealersController } from "./dealers.controller";
import { DealersPrismaRepository } from "./dealers.prisma-repository";
import { DEALERS_REPOSITORY } from "./dealers.repository";
import { DealersService } from "./dealers.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DealersController],
  providers: [
    DealersService,
    {
      provide: DEALERS_REPOSITORY,
      useClass: DealersPrismaRepository,
    },
  ],
})
export class DealersModule {}
