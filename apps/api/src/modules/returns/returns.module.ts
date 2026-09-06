import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ReturnsController } from "./returns.controller";
import { ReturnsPrismaRepository } from "./returns.prisma-repository";
import { RETURNS_REPOSITORY } from "./returns.repository";
import { ReturnsService } from "./returns.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ReturnsController],
  providers: [
    ReturnsService,
    {
      provide: RETURNS_REPOSITORY,
      useClass: ReturnsPrismaRepository,
    },
  ],
})
export class ReturnsModule {}
