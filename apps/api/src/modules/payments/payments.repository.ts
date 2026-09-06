import type { Payment, PaymentCaptureInput, PaymentCreateInput, PaymentListQuery, PaymentMutationResponse } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const PAYMENTS_REPOSITORY = Symbol("PAYMENTS_REPOSITORY");

export interface PaymentsRepository {
  listPayments(query: PaymentListQuery): Promise<{ items: Payment[]; total: number; page: number; page_size: number }>;
  getOrderById(orderId: number): Promise<{ id: number; user_id: number | null; company_id: number | null; total_minor: number; currency: string; order_no: string } | null>;
  createPayment(input: PaymentCreateInput & { amount_minor: number; request_id: string; payload: unknown; status: string }): Promise<PaymentMutationResponse["item"]>;
  getPaymentById(id: number): Promise<Payment | null>;
  capturePayment(id: number, requestId: string, input: PaymentCaptureInput): Promise<Payment>;
  refundPayment(id: number, input: { amount_minor?: number; reason?: string }, requestId: string): Promise<Payment>;
}
