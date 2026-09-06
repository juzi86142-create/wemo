import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../../runtime/request-context.store";
import type { CommerceStateStore } from "../../../runtime/commerce.state";
import type { AuthorizationService } from "../../../runtime/authorization.service";
import { CartService } from "./cart.service";

describe("CartService", () => {
  let service: CartService;
  let stateStore: CommerceStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      getOrCreateCart: vi.fn(),
      listCarts: vi.fn(),
      previewPricing: vi.fn(),
      upsertCartItem: vi.fn(),
      removeCartItem: vi.fn(),
      mergeCarts: vi.fn(),
      clearCart: vi.fn(),
    } as any;

    authorization = {
      requireStaffPermission: vi.fn(),
      requireActor: vi.fn(),
    } as any;

    requestContext = {
      requireContext: vi.fn(() => ({
        request_id: "req-cart-123",
        ip: "127.0.0.1",
        market: "global",
        currency: "USD",
        actor: {
          user_id: 1,
          audience: "user",
          permissions: [],
        },
      })),
    } as any;

    service = new CartService(
      stateStore,
      authorization,
      requestContext,
    );
  });

  describe("getCurrent", () => {
    it("获取当前用户的购物车", async () => {
      const cart = {
        id: 1,
        user_id: 1,
        company_id: null,
        channel: "user",
        market: "global",
        currency: "USD",
        status: "active",
        items: [],
        request_id: "req-cart-123",
      };

      stateStore.getOrCreateCart.mockReturnValue(cart);

      const result = await service.getCurrent({});

      expect(stateStore.getOrCreateCart).toHaveBeenCalledWith({
        channel: "user",
        user_id: 1,
        company_id: null,
        market: "global",
        currency: "USD",
        dealer_company_id: undefined,
      });

      expect(result).toMatchObject({
        request_id: "req-cart-123",
        item: cart,
      });
    });

    it("游客获取购物车", async () => {
      const cart = {
        id: 2,
        user_id: null,
        company_id: null,
        channel: "guest",
        market: "global",
        currency: "USD",
        status: "active",
        items: [],
        request_id: "req-cart-123",
      };

      requestContext.requireContext.mockReturnValue({
        request_id: "req-cart-123",
        ip: "127.0.0.1",
        market: "global",
        currency: "USD",
        actor: null,
      });

      stateStore.getOrCreateCart.mockReturnValue(cart);

      const result = await service.getCurrent({});

      expect(result).toMatchObject({
        request_id: "req-cart-123",
        item: cart,
      });
    });
  });

  describe("listCarts", () => {
    it("员工列出所有购物车", async () => {
      const carts = {
        items: [
          { id: 1, user_id: 1, status: "active" },
          { id: 2, user_id: 2, status: "active" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["cart:read"],
      });

      stateStore.listCarts.mockReturnValue(carts);

      const result = await service.listCarts({
        page: 1,
        page_size: 20,
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "cart:read",
      );
      expect(stateStore.listCarts).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(carts);
    });
  });

  describe("addItem", () => {
    it("向购物车添加商品", async () => {
      const cart = { id: 1, user_id: 1, status: "active" };
      const pricing = {
        items: [
          {
            variant_id: 1,
            quantity: 2,
            unit_price_minor: 5000,
            line_total_minor: 10000,
          },
        ],
      };

      stateStore.getOrCreateCart.mockReturnValue(cart);
      stateStore.previewPricing.mockReturnValue({
        items: [
          {
            variant_id: 1,
            quantity: 2,
            unit_price_minor: 5000,
            currency: "USD",
          },
        ],
      });
      stateStore.upsertCartItem.mockReturnValue({
        id: 1,
        cart_id: 1,
        variant_id: 1,
        quantity: 2,
        unit_price_minor: 5000,
        currency: "USD",
      });

      const result = await service.addItem({
        variant_id: 1,
        quantity: 2,
      });

      expect(stateStore.upsertCartItem).toHaveBeenCalledWith(1, {
        variant_id: 1,
        quantity: 2,
        unit_price_minor: 5000,
        currency: "USD",
      });

      expect(result).toMatchObject({
        request_id: "req-cart-123",
        item: expect.objectContaining({
          variant_id: 1,
          quantity: 2,
        }),
      });
    });
  });

  describe("removeItem", () => {
    it("从购物车移除商品", async () => {
      stateStore.removeCartItem.mockReturnValue(undefined);

      await service.removeItem(1, 1);

      expect(stateStore.removeCartItem).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("mergeCarts", () => {
    it("合并两个购物车", async () => {
      const mergedCart = {
        id: 1,
        user_id: 1,
        status: "active",
        items: [{ id: 1, variant_id: 1, quantity: 2 }],
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.mergeCarts.mockReturnValue(mergedCart);

      const result = await service.mergeCarts({
        target_cart_id: 1,
        source_cart_id: 2,
      });

      expect(stateStore.mergeCarts).toHaveBeenCalledWith({
        target_cart_id: 1,
        source_cart_id: 2,
        user_id: 1,
      });

      expect(result).toMatchObject({
        request_id: "req-cart-123",
        item: mergedCart,
      });
    });
  });

  describe("clearCart", () => {
    it("清空购物车", async () => {
      stateStore.clearCart.mockReturnValue(undefined);

      await service.clearCart(1);

      expect(stateStore.clearCart).toHaveBeenCalledWith(1);
    });
  });
});
