import { Inject, Injectable } from "@nestjs/common";
import {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { AUDIT_REPOSITORY, type AuditRepository } from "./audit.repository";

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly repository: AuditRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  async listAuditLogs(query: unknown) {
    this.authorization.requireStaffPermission("audit:read");
    const parsed = parseInput(AuditLogQuerySchema, query);
    const result = await this.repository.queryEntries(parsed);
    return AuditLogListResponseSchema.parse(result);
  }
}
