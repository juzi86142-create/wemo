import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            listPayments: vi.fn(),
            createPayment: vi.fn(),
            capturePayment: vi.fn(),
            refundPayment: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listPayments", () => {
    it("调用service.listPayments并返回结果", async () => {
      const mockResult = {
        items: [
          { id: 1, order_id: 1, amount_minor: 10000, status: "succeeded" },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listPayments).mockReturnValue(mockResult);

      const result = await controller.listPayments({
        page: 1,
        page_size: 20,
      });

      expect(service.listPayments).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("createPayment", () => {
    it("调用service.createPayment并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, order_id: 1, amount_minor: 10000, status: "pending" },
      };

      vi.mocked(service.createPayment).mockResolvedValue(mockResult);

      const result = await controller.createPayment({
        order_id: 1,
        provider: "stripe",
        idempotency_key: "key-123",
      });

      expect(service.createPayment).toHaveBeenCalledWith({
        order_id: 1,
        provider: "stripe",
        idempotency_key: "key-123",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("capturePayment", () => {
    it("调用service.capturePayment并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "succeeded", captured_at: "2026-09-06T00:00:00.000Z" },
      };

      vi.mocked(service.capturePayment).mockResolvedValue(mockResult);

      const result = await controller.capturePayment("1", {
        provider_txn_id: "txn-123",
      });

      expect(service.capturePayment).toHaveBeenCalledWith("1", {
        provider_txn_id: "txn-123",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("refundPayment", () => {
    it("调用service.refundPayment并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "refunded" },
      };

      vi.mocked(service.refundPayment).mockResolvedValue(mockResult);

      const result = await controller.refundPayment("1", {
        amount_minor: 10000,
        reason: "客户申请退款",
      });

      expect(service.refundPayment).toHaveBeenCalledWith("1", {
        amount_minor: 10000,
        reason: "客户申请退款",
      });
      expect(result).toEqual(mockResult);
    });
  });
});
