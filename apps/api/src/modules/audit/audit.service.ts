import { Inject, Injectable } from "@nestjs/common";
import {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
} from "@wemo/contracts/platform";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";

@Injectable()
export class AuditService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  listAuditLogs(query: unknown) {
    this.authorization.requireStaffPermission("audit:read");
    const parsed = parseInput(AuditLogQuerySchema, query);
    return AuditLogListResponseSchema.parse(
      this.stateStore.listAuditLogs(parsed),
    );
  }
}
