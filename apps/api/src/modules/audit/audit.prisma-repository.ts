import { Inject, Injectable } from "@nestjs/common";
import type { AuditLog, AuditLogQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import type {
  AuditLogPage,
  AuditLogRecordInput,
  AuditRepository,
} from "./audit.repository";

type AuditLogRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["auditLog"]["findFirst"]>>
>;

@Injectable()
export class AuditPrismaRepository implements AuditRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async recordLog(input: AuditLogRecordInput): Promise<AuditLog> {
    const row = await this.database.auditLog.create({
      data: {
        actorId: input.actor_id,
        action: input.action,
        entity: input.entity,
        entityId: input.entity_id,
        before: (input.before ?? null) as never,
        after: (input.after ?? null) as never,
        ip: input.ip ?? null,
        requestId: input.request_id,
      },
    });
    return this.mapRow(row);
  }

  async queryEntries(query: AuditLogQuery): Promise<AuditLogPage> {
    const where: Record<string, unknown> = {};
    if (query.actor_id !== undefined) where.actorId = query.actor_id;
    if (query.action !== undefined) where.action = query.action;
    if (query.entity !== undefined) where.entity = query.entity;
    if (query.request_id !== undefined) where.requestId = query.request_id;

    const [rows, total] = await Promise.all([
      this.database.auditLog.findMany({
        where: where as never,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.auditLog.count({ where: where as never }),
    ]);

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  private mapRow(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      actor_id: row.actorId ?? 1,
      action: row.action,
      entity: row.entity,
      entity_id: row.entityId,
      before: row.before as AuditLog["before"],
      after: row.after as AuditLog["after"],
      ip: row.ip,
      request_id: row.requestId,
      created_at: row.createdAt.toISOString(),
    };
  }
}
