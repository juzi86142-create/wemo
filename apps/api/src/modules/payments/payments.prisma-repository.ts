import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { PAYMENTS_REPOSITORY, type PaymentsRepository } from "./payments.repository";
import type { Payment, PaymentCaptureInput, PaymentCreateInput } from "@wemo/contracts";

@Injectable()
export class PaymentsPrismaRepository implements PaymentsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listPayments(query: any): Promise<{ items: Payment[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.order_id) where.orderId = query.order_id;
    if (query.status) where.status = query.status;
    if (query.provider) where.provider = query.provider;

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
      items: payments.map(p => this.mapPayment(p)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getOrderById(orderId: number): Promise<any | null> {
    const order = await this.database.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, companyId: true, totalMinor: true, currency: true, orderNo: true },
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

  async createPayment(input: any): Promise<PaymentMutationResponse["item"]> {
    const payment = await this.database.payment.create({
      data: {
        orderId: input.order_id,
        provider: input.provider,
        providerTxnId: null,
        status: input.status,
        amountMinor: input.amount_minor,
        currency: "USD", // From order
        idempotencyKey: input.idempotency_key,
      },
    });

    return this.mapPayment(payment);
  }

  async getPaymentById(id: number): Promise<Payment | null> {
    const payment = await this.database.payment.findUnique({ where: { id } });
    return payment ? this.mapPayment(payment) : null;
  }

  async capturePayment(id: number, requestId: string, input: PaymentCaptureInput): Promise<Payment> {
    const payment = await this.database.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "succeeded",
          providerTxnId: input.provider_txn_id,
        },
      });

      // Update order status to paid
      await tx.order.update({
        where: { id: updated.orderId },
        data: { status: "paid" },
      });

      return updated;
    });

    return this.mapPayment(payment);
  }

  async refundPayment(id: number, input: { amount_minor?: number; reason?: string }, requestId: string): Promise<Payment> {
    const payment = await this.database.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: { status: "refunded" },
      });

      // Update order status
      await tx.order.update({
        where: { id: updated.orderId },
        data: { status: "refunded" },
      });

      return updated;
    });

    return this.mapPayment(payment);
  }

  private mapPayment(payment: any): Payment {
    return {
      id: payment.id,
      order_id: payment.orderId,
      provider: payment.provider,
      provider_txn_id: payment.providerTxnId,
      status: payment.status,
      amount_minor: payment.amountMinor,
      currency: payment.currency,
      failure_reason: payment.failureReason,
      idempotency_key: payment.idempotencyKey,
      created_at: payment.createdAt.toISOString(),
      updated_at: payment.updatedAt.toISOString(),
    };
  }
}
