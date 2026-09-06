import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

describe("CartController", () => {
  let controller: CartController;
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCurrent: vi.fn(),
            listCarts: vi.fn(),
            addItem: vi.fn(),
            removeItem: vi.fn(),
            updateItem: vi.fn(),
            mergeCarts: vi.fn(),
            clearCart: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrent", () => {
    it("调用service.getCurrent并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, user_id: 1, status: "active", items: [] },
      };

      vi.mocked(service.getCurrent).mockResolvedValue(mockResult);

      const result = await controller.getCurrent({});

      expect(service.getCurrent).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });
  });

  describe("listCarts", () => {
    it("调用service.listCarts并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, user_id: 1, status: "active" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listCarts).mockReturnValue(mockResult);

      const result = await controller.listCarts({
        page: 1,
        page_size: 20,
      });

      expect(service.listCarts).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("addItem", () => {
    it("调用service.addItem并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, cart_id: 1, variant_id: 1, quantity: 2 },
      };

      vi.mocked(service.addItem).mockResolvedValue(mockResult);

      const result = await controller.addItem({
        variant_id: 1,
        quantity: 2,
      });

      expect(service.addItem).toHaveBeenCalledWith({
        variant_id: 1,
        quantity: 2,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("removeItem", () => {
    it("调用service.removeItem", async () => {
      vi.mocked(service.removeItem).mockResolvedValue(undefined);

      await controller.removeItem(1, 1);

      expect(service.removeItem).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("updateItem", () => {
    it("调用service.updateItem并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, cart_id: 1, variant_id: 1, quantity: 3 },
      };

      vi.mocked(service.updateItem).mockResolvedValue(mockResult);

      const result = await controller.updateItem(1, 1, {
        quantity: 3,
      });

      expect(service.updateItem).toHaveBeenCalledWith(1, 1, {
        quantity: 3,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("mergeCarts", () => {
    it("调用service.mergeCarts并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, user_id: 1, items: [] },
      };

      vi.mocked(service.mergeCarts).mockResolvedValue(mockResult);

      const result = await controller.mergeCarts({
        target_cart_id: 1,
        source_cart_id: 2,
      });

      expect(service.mergeCarts).toHaveBeenCalledWith({
        target_cart_id: 1,
        source_cart_id: 2,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("clearCart", () => {
    it("调用service.clearCart", async () => {
      vi.mocked(service.clearCart).mockResolvedValue(undefined);

      await controller.clearCart(1);

      expect(service.clearCart).toHaveBeenCalledWith(1);
    });
  });
});
