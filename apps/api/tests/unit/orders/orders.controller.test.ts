import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

describe("OrdersController", () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            listOrders: vi.fn(),
            getOrder: vi.fn(),
            createOrder: vi.fn(),
            updateStatus: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listOrders", () => {
    it("调用service.listOrders并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, status: "paid" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listOrders).mockReturnValue(mockResult);

      const result = await controller.listOrders({
        page: 1,
        page_size: 20,
      });

      expect(service.listOrders).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("getOrder", () => {
    it("调用service.getOrder并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "paid", total_minor: 10000 },
      };

      vi.mocked(service.getOrder).mockResolvedValue(mockResult);

      const result = await controller.getOrder("1");

      expect(service.getOrder).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockResult);
    });
  });

  describe("createOrder", () => {
    it("调用service.createOrder并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "pending_payment", total_minor: 10000 },
      };

      vi.mocked(service.createOrder).mockResolvedValue(mockResult);

      const result = await controller.createOrder({
        channel: "b2c",
        items: [{ variant_id: 1, quantity: 2 }],
        market: "global",
        currency: "USD",
      });

      expect(service.createOrder).toHaveBeenCalledWith({
        channel: "b2c",
        items: [{ variant_id: 1, quantity: 2 }],
        market: "global",
        currency: "USD",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateStatus", () => {
    it("调用service.updateStatus并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "paid" },
      };

      vi.mocked(service.updateStatus).mockResolvedValue(mockResult);

      const result = await controller.updateStatus("1", {
        status: "paid",
      });

      expect(service.updateStatus).toHaveBeenCalledWith("1", {
        status: "paid",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("listAdminOrders", () => {
    it("调用service.listOrders并返回结果", async () => {
      const mockResult = {
        items: [
          { id: 1, status: "paid" },
          { id: 2, status: "processing" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listOrders).mockReturnValue(mockResult);

      const result = await controller.listAdminOrders({
        page: 1,
        page_size: 20,
      });

      expect(service.listOrders).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateAdminStatus", () => {
    it("调用service.updateStatus并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, status: "shipped" },
      };

      vi.mocked(service.updateStatus).mockResolvedValue(mockResult);

      const result = await controller.updateAdminStatus("1", {
        status: "shipped",
      });

      expect(service.updateStatus).toHaveBeenCalledWith("1", {
        status: "shipped",
      });
      expect(result).toEqual(mockResult);
    });
  });
});
