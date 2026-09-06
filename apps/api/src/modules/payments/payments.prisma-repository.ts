import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  Payment,
  PaymentCaptureInput,
  PaymentListQuery,
} from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  PAYMENTS_REPOSITORY,
  type PaymentCreateRecord,
  type PaymentsRepository,
} from "./payments.repository";

type PaymentRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["payment"]["findUnique"]>>
>;

@Injectable()
export class PaymentsPrismaRepository implements PaymentsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async listPayments(query: PaymentListQuery): Promise<{
    items: Payment[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where = {
      ...(query.order_id !== undefined ? { orderId: query.order_id } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.provider !== undefined ? { provider: query.provider } : {}),
    };

    const [payments, total] = await Promise.all([
      this.database.payment.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.payment.count({ where }),
    ]);

    return {
      items: payments.map((payment) => this.mapPayment(payment)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getOrderById(orderId: number): Promise<{
    id: number;
    user_id: number | null;
    company_id: number | null;
    total_minor: number;
    currency: string;
    order_no: string;
  } | null> {
    const order = await this.database.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        companyId: true,
        totalMinor: true,
        currency: true,
        orderNo: true,
      },
    });

    return order
      ? {
          id: order.id,
          user_id: order.userId,
          company_id: order.companyId,
          total_minor: order.totalMinor,
          currency: order.currency,
          order_no: order.orderNo,
        }
      : null;
  }

  async createPayment(input: PaymentCreateRecord): Promise<Payment> {
    const existing = await this.database.payment.findUnique({
      where: { idempotencyKey: input.idempotency_key },
    });
    if (existing) {
      return this.mapPayment(existing);
    }

    const payment = await this.database.payment.create({
      data: {
        orderId: input.order_id,
        provider: input.provider,
        providerTxnId: input.provider_txn_id ?? null,
        status: input.status,
        amountMinor: input.amount_minor,
        currency: input.currency,
        idempotencyKey: input.idempotency_key,
      },
    });

    return this.mapPayment(payment);
  }

  async getPaymentById(id: number): Promise<Payment | null> {
    const payment = await this.database.payment.findUnique({
      where: { id },
    });
    return payment ? this.mapPayment(payment) : null;
  }

  async capturePayment(
    id: number,
    requestId: string,
    input: PaymentCaptureInput,
  ): Promise<Payment> {
    const payment = await this.database.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "paid",
          ...(input.provider_txn_id !== undefined
            ? { providerTxnId: input.provider_txn_id }
            : {}),
        },
      });

      await tx.order.update({
        where: { id: updated.orderId },
        data: { status: "paid" },
      });

      return updated;
    });

    return this.mapPayment(payment);
  }

  async refundPayment(
    id: number,
    input: { amount_minor?: number | undefined; reason?: string | undefined },
    requestId: string,
  ): Promise<Payment> {
    const payment = await this.database.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "refunded",
          ...(input.reason !== undefined
            ? { failureReason: input.reason }
            : {}),
        },
      });

      await tx.order.update({
        where: { id: updated.orderId },
        data: { status: "refunded" },
      });

      return updated;
    });

    return this.mapPayment(payment);
  }

  private mapPayment(payment: PaymentRow): Payment {
    return {
      id: payment.id,
      order_id: payment.orderId,
      provider: payment.provider,
      provider_txn_id: payment.providerTxnId,
      status: payment.status as Payment["status"],
      amount_minor: payment.amountMinor,
      currency: payment.currency,
      failure_reason: payment.failureReason,
      idempotency_key: payment.idempotencyKey,
      refunded_minor: payment.status === "refunded" ? payment.amountMinor : 0,
      payload: {},
      created_at: payment.createdAt.toISOString(),
      updated_at: payment.updatedAt.toISOString(),
    };
  }
}
