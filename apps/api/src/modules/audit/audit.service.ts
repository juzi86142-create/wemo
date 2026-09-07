import { Inject, Injectable } from "@nestjs/common";
import {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformRepository } from "../../runtime/platform-state.store";

@Injectable()
export class AuditService {
  constructor(
    @Inject(PlatformRepository)
    private readonly stateStore: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  async listAuditLogs(query: unknown) {
    this.authorization.requireStaffPermission("audit:read");
    const parsed = parseInput(AuditLogQuerySchema, query);
    return AuditLogListResponseSchema.parse(
      await this.stateStore.listAuditLogs(parsed),
    );
  }
}

