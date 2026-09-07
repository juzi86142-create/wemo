import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuditController } from "./audit.controller";
import { AuditPrismaRepository } from "./audit.prisma-repository";
import { AUDIT_REPOSITORY } from "./audit.repository";
import { AuditService } from "./audit.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: AUDIT_REPOSITORY,
      useClass: AuditPrismaRepository,
    },
  ],
  exports: [AUDIT_REPOSITORY],
})
export class AuditModule {}
