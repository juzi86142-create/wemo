import type {
  Payment,
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentListQuery,
} from "@wemo/contracts";

export const PAYMENTS_REPOSITORY = Symbol("PAYMENTS_REPOSITORY");

/** createPayment 的仓储入参：契约字段 + 服务层推导的上下文字段。 */
export type PaymentCreateRecord = PaymentCreateInput & {
  amount_minor: number;
  currency: string;
  request_id: string;
  payload: unknown;
  status: string;
  provider_txn_id?: string | null;
};

export interface PaymentsRepository {
  listPayments(query: PaymentListQuery): Promise<{
    items: Payment[];
    total: number;
    page: number;
    page_size: number;
  }>;
  getOrderById(orderId: number): Promise<{
    id: number;
    user_id: number | null;
    company_id: number | null;
    total_minor: number;
    currency: string;
    order_no: string;
  } | null>;
  createPayment(input: PaymentCreateRecord): Promise<Payment>;
  getPaymentById(id: number): Promise<Payment | null>;
  capturePayment(
    id: number,
    requestId: string,
    input: PaymentCaptureInput,
  ): Promise<Payment>;
  refundPayment(
    id: number,
    input: { amount_minor?: number; reason?: string },
    requestId: string,
  ): Promise<Payment>;
}
