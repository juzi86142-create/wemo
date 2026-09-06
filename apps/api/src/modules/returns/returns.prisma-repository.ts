import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { RETURNS_REPOSITORY, type ReturnsRepository } from "./returns.repository";
import type { ReturnRequest } from "@wemo/contracts";

@Injectable()
export class ReturnsPrismaRepository implements ReturnsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createReturn(input: any): Promise<ReturnRequest> {
    const returnNo = `RET-${Date.now()}`;
    const returnRecord = await this.database.returnRequest.create({
      data: {
        returnNo,
        orderId: input.order_id,
        orderItemId: input.order_item_id,
        customerId: input.customer_id,
        reason: input.reason,
        status: "pending",
        quantity: input.quantity,
        refundAmountMinor: input.refund_amount_minor,
        currency: input.currency,
        images: input.images || [],
        notes: input.notes,
      },
    });

    return this.mapReturn(returnRecord);
  }

  async getReturnById(id: number): Promise<ReturnRequest | null> {
    const returnRecord = await this.database.returnRequest.findUnique({
      where: { id },
    });

    return returnRecord ? this.mapReturn(returnRecord) : null;
  }

  async listReturns(query: any): Promise<{ items: ReturnRequest[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.customer_id) where.customerId = query.customer_id;
    if (query.order_id) where.orderId = query.order_id;
    if (query.status) where.status = query.status;

    const [returns, total] = await Promise.all([
      this.database.returnRequest.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.returnRequest.count({ where }),
    ]);

    return {
      items: returns.map(r => this.mapReturn(r)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateReturnStatus(id: number, input: any): Promise<ReturnRequest> {
    const returnRecord = await this.database.returnRequest.update({
      where: { id },
      data: {
        status: input.status,
        notes: input.notes,
      },
    });

    return this.mapReturn(returnRecord);
  }

  async approveReturn(id: number, requestId: string, note?: string): Promise<ReturnRequest> {
    const returnRecord = await this.database.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id },
        data: {
          status: "approved",
          notes: note ? `${note}` : undefined,
        },
      });

      await tx.auditEntry.create({
        data: {
          userId: 0,
          actorId: 0,
          action: "return.approve",
          resourceType: "return",
          resourceId: id.toString(),
          ip: "",
          userAgent: "",
        },
      });

      return updated;
    });

    return this.mapReturn(returnRecord);
  }

  async rejectReturn(id: number, requestId: string, note?: string): Promise<ReturnRequest> {
    const returnRecord = await this.database.returnRequest.update({
      where: { id },
      data: {
        status: "rejected",
        notes: note,
      },
    });

    return this.mapReturn(returnRecord);
  }

  private mapReturn(returnRecord: any): ReturnRequest {
    return {
      id: returnRecord.id,
      return_no: returnRecord.returnNo,
      order_id: returnRecord.orderId,
      order_item_id: returnRecord.orderItemId,
      customer_id: returnRecord.customerId,
      reason: returnRecord.reason,
      status: returnRecord.status,
      quantity: returnRecord.quantity,
      refund_amount_minor: returnRecord.refundAmountMinor,
      currency: returnRecord.currency,
      images: returnRecord.images || [],
      notes: returnRecord.notes,
      created_at: returnRecord.createdAt.toISOString(),
      updated_at: returnRecord.updatedAt.toISOString(),
    };
  }
}
