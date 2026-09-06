import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { AUDIT_REPOSITORY, type AuditRepository } from "./audit.repository";
import type { AuditEntry, AuditEntryCreateInput, AuditEntryQuery } from "@wemo/contracts";

@Injectable()
export class AuditPrismaRepository implements AuditRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async logEntry(input: AuditEntryCreateInput): Promise<AuditEntry> {
    const entry = await this.database.auditEntry.create({
      data: {
        userId: input.user_id,
        actorId: input.actor_id,
        action: input.action,
        resourceType: input.resource_type,
        resourceId: input.resource_id,
        before: input.before ?? {},
        after: input.after ?? {},
        ip: input.ip,
        userAgent: input.user_agent,
      },
    });

    return {
      id: entry.id,
      user_id: entry.userId,
      actor_id: entry.actorId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      before: entry.before as any,
      after: entry.after as any,
      ip: entry.ip,
      user_agent: entry.userAgent,
      created_at: entry.createdAt.toISOString(),
    };
  }

  async queryEntries(query: AuditEntryQuery): Promise<{ items: AuditEntry[]; total: number }> {
    const where: any = {};
    if (query.user_id) where.userId = query.user_id;
    if (query.action) where.action = query.action;
    if (query.resource_type) where.resourceType = query.resource_type;
    if (query.start_date && query.end_date) {
      where.createdAt = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }

    const [entries, total] = await Promise.all([
      this.database.auditEntry.findMany({
        where,
        skip: (query.page - 1) * (query.page_size || 20),
        take: query.page_size || 20,
        orderBy: { createdAt: "desc" },
      }),
      this.database.auditEntry.count({ where }),
    ]);

    return {
      items: entries.map(e => ({
        id: e.id,
        user_id: e.userId,
        actor_id: e.actorId,
        action: e.action,
        resource_type: e.resourceType,
        resource_id: e.resourceId,
        before: e.before as any,
        after: e.after as any,
        ip: e.ip,
        user_agent: e.userAgent,
        created_at: e.createdAt.toISOString(),
      })),
      total,
    };
  }
}
