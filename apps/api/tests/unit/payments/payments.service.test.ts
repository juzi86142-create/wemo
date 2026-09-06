import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../runtime/request-context.store";
import type { CommerceStateStore } from "../../runtime/commerce.state";
import type { PlatformStateStore } from "../../runtime/platform-state.store";
import type { AuthorizationService } from "../../runtime/authorization.service";
import { PaymentsService } from "./payments.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let stateStore: CommerceStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      listPayments: vi.fn(),
      getOrderById: vi.fn(),
      createPayment: vi.fn(),
      getPaymentById: vi.fn(),
      capturePayment: vi.fn(),
      refundPayment: vi.fn(),
      transitionOrder: vi.fn(),
    } as any;

    platformState = {
      recordAudit: vi.fn(),
    } as any;

    authorization = {
      requireStaffPermission: vi.fn(),
      requireActor: vi.fn(),
    } as any;

    requestContext = {
      requireContext: vi.fn(() => ({
        request_id: "req-payment-123",
        ip: "127.0.0.1",
        actor: {
          user_id: 1,
          audience: "user",
          permissions: [],
        },
      })),
    } as any;

    service = new PaymentsService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("listPayments", () => {
    it("员工查看支付列表", async () => {
      const payments = {
        items: [
          {
            id: 1,
            order_id: 1,
            amount_minor: 10000,
            currency: "USD",
            status: "succeeded",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["payments:read"],
      });

      stateStore.listPayments.mockReturnValue(payments);

      const result = await service.listPayments({
        page: 1,
        page_size: 20,
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "payments:read",
      );
      expect(stateStore.listPayments).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(payments);
    });
  });

  describe("createPayment", () => {
    it("用户为自己的订单创建支付", async () => {
      const order = {
        id: 1,
        user_id: 1,
        company_id: null,
        total_minor: 10000,
        currency: "USD",
        order_no: "ORD-001",
      };

      const payment = {
        id: 1,
        order_id: 1,
        amount_minor: 10000,
        currency: "USD",
        status: "pending",
      };

      stateStore.getOrderById.mockReturnValue(order);
      stateStore.createPayment.mockReturnValue(payment);

      const result = await service.createPayment({
        order_id: 1,
        provider: "stripe",
        idempotency_key: "key-123",
      });

      expect(stateStore.getOrderById).toHaveBeenCalledWith(1);
      expect(stateStore.createPayment).toHaveBeenCalledWith({
        amount_minor: 10000,
        idempotency_key: "key-123",
        order_id: 1,
        provider: "stripe",
        request_id: "req-payment-123",
        payload: {
          currency: "USD",
          order_no: "ORD-001",
        },
        provider_txn_id: null,
        status: "pending",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "payments.create",
        entity: "payment",
        entity_id: 1,
        before: null,
        after: payment,
        ip: "127.0.0.1",
        request_id: "req-payment-123",
      });

      expect(result).toMatchObject({
        request_id: "req-payment-123",
        item: payment,
      });
    });

    it("指定支付金额", async () => {
      const order = {
        id: 1,
        user_id: 1,
        company_id: null,
        total_minor: 10000,
        currency: "USD",
        order_no: "ORD-001",
      };

      const payment = {
        id: 2,
        order_id: 1,
        amount_minor: 5000,
        currency: "USD",
        status: "pending",
      };

      stateStore.getOrderById.mockReturnValue(order);
      stateStore.createPayment.mockReturnValue(payment);

      const result = await service.createPayment({
        order_id: 1,
        amount_minor: 5000,
        provider: "stripe",
        idempotency_key: "key-456",
      });

      expect(stateStore.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount_minor: 5000,
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-payment-123",
        item: payment,
      });
    });
  });

  describe("capturePayment", () => {
    it("捕获支付并更新订单状态", async () => {
      const beforePayment = {
        id: 1,
        order_id: 1,
        status: "pending",
      };

      const afterPayment = {
        id: 1,
        order_id: 1,
        status: "succeeded",
        captured_at: "2026-09-06T00:00:00.000Z",
      };

      stateStore.getPaymentById.mockReturnValue(beforePayment);
      stateStore.capturePayment.mockReturnValue(afterPayment);
      stateStore.transitionOrder.mockReturnValue({
        id: 1,
        status: "paid",
      });

      const result = await service.capturePayment(1, {
        provider_txn_id: "txn-123",
      });

      expect(stateStore.capturePayment).toHaveBeenCalledWith(
        1,
        "req-payment-123",
        { provider_txn_id: "txn-123" },
      );

      expect(stateStore.transitionOrder).toHaveBeenCalledWith(
        1,
        "paid",
        "req-payment-123",
        "payment captured",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "payments.capture",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-payment-123",
        item: afterPayment,
      });
    });
  });

  describe("refundPayment", () => {
    it("退款支付", async () => {
      const payment = {
        id: 1,
        order_id: 1,
        amount_minor: 10000,
        status: "succeeded",
      };

      const refundedPayment = {
        id: 1,
        order_id: 1,
        amount_minor: 10000,
        status: "refunded",
      };

      stateStore.getPaymentById.mockReturnValue(payment);
      stateStore.refundPayment.mockReturnValue(refundedPayment);
      stateStore.transitionOrder.mockReturnValue({
        id: 1,
        status: "refunded",
      });

      const result = await service.refundPayment(1, {
        amount_minor: 10000,
        reason: "客户申请退款",
      });

      expect(stateStore.refundPayment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          amount_minor: 10000,
          reason: "客户申请退款",
        }),
        "req-payment-123",
      );

      expect(stateStore.transitionOrder).toHaveBeenCalledWith(
        1,
        "refunded",
        "req-payment-123",
        "payment refunded",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "payments.refund",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-payment-123",
        item: refundedPayment,
      });
    });
  });
});
