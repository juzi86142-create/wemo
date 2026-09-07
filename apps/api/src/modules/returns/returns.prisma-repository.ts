import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type { ReturnListQuery, ReturnRequest, ReturnStatus } from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  RETURNS_REPOSITORY,
  type ReturnCreateRecord,
  type ReturnsRepository,
} from "./returns.repository";
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
} from "../audit/audit.repository";

type ReturnRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["returnRequest"]["findUnique"]>>
>;

@Injectable()
export class ReturnsPrismaRepository implements ReturnsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(AUDIT_REPOSITORY) private readonly audit: AuditRepository,
  ) {}

  async createReturn(input: ReturnCreateRecord): Promise<ReturnRequest> {
    const row = await this.database.returnRequest.create({
      data: {
        orderId: input.order_id,
        userId: input.user_id,
        companyId: input.company_id,
        status: "requested",
        reason: input.reason,
        items: input.items as never,
        attachments: input.attachments as never,
      },
    });

    return this.mapReturn(row);
  }

  async getReturnById(id: number): Promise<ReturnRequest | null> {
    const row = await this.database.returnRequest.findUnique({
      where: { id },
    });
    return row ? this.mapReturn(row) : null;
  }

  async listReturns(query: ReturnListQuery): Promise<{
    items: ReturnRequest[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where = {
      ...(query.order_id !== undefined ? { orderId: query.order_id } : {}),
      ...(query.user_id !== undefined ? { userId: query.user_id } : {}),
      ...(query.company_id !== undefined
        ? { companyId: query.company_id }
        : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.database.returnRequest.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.returnRequest.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapReturn(row)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async reviewReturn(
    id: number,
    requestId: string,
    decision: ReturnStatus,
    note?: string,
  ): Promise<ReturnRequest> {
    const existing = await this.database.returnRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("退货申请不存在");
    }

    const row = await this.database.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id },
        data: {
          status: decision,
        },
      });

      await this.audit.recordLog({
        actor_id: null,
        action: `return.${decision}`,
        entity: "return_request",
        entity_id: id,
        before: { status: existing.status },
        after: { status: decision, note: note ?? null },
        request_id: requestId,
        ip: null,
      });

      return updated;
    });

    return this.mapReturn(row);
  }

  private mapReturn(row: ReturnRow): ReturnRequest {
    return {
      id: row.id,
      order_id: row.orderId,
      user_id: row.userId,
      company_id: row.companyId,
      status: row.status as ReturnRequest["status"],
      reason: row.reason,
      items: row.items as ReturnRequest["items"],
      attachments: row.attachments as ReturnRequest["attachments"],
      history: [],
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      refunded_at:
        row.status === "refunded" ? row.updatedAt.toISOString() : null,
    } as ReturnRequest;
  }
}
