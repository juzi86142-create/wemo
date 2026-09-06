import { Inject, Injectable } from "@nestjs/common";
import {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { AuditPrismaRepository } from "./audit.prisma-repository";
import { AUDIT_REPOSITORY } from "./audit.repository";
import { parseInput } from "../../runtime/validation";

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly repository: AuditPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  listAuditLogs(query: unknown) {
    this.authorization.requireStaffPermission("audit:read");
    const parsed = parseInput(AuditLogQuerySchema, query);
    return AuditLogListResponseSchema.parse(
      this.repository.queryEntries(parsed),
    );
  }
}
