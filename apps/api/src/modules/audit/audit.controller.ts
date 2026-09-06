import { Controller, Get, Inject, Query } from "@nestjs/common";

import { AuditService } from "./audit.service";

@Controller("admin/audit-logs")
export class AuditController {
  constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  @Get()
  listAuditLogs(@Query() query: unknown) {
    return this.auditService.listAuditLogs(query);
  }
}
