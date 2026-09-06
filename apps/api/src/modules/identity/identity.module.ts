import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { IdentityController } from "./identity.controller";
import { IdentityPrismaRepository } from "./identity.prisma-repository";
import { IDENTITY_REPOSITORY } from "./identity.repository";
import { IdentityService } from "./identity.service";

@Module({
  imports: [DatabaseModule],
  controllers: [IdentityController],
  providers: [
    IdentityService,
    {
      provide: IDENTITY_REPOSITORY,
      useClass: IdentityPrismaRepository,
    },
  ],
})
export class IdentityModule {}
