import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../runtime/request-context.store";
import type { CommerceStateStore } from "../../runtime/commerce.state";
import type { ExperienceStateStore } from "../../runtime/experience.state";
import type { PlatformStateStore } from "../../runtime/platform-state.store";
import type { AuthorizationService } from "../../runtime/authorization.service";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  let service: OrdersService;
  let stateStore: CommerceStateStore;
  let experience: ExperienceStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      listOrders: vi.fn(),
      getOrderById: vi.fn(),
      createOrder: vi.fn(),
      previewPricing: vi.fn(),
      findOrderByRequestId: vi.fn(),
      reserveInventory: vi.fn(),
      releaseInventory: vi.fn(),
      transitionOrder: vi.fn(),
    } as any;

    experience = {} as any;

    platformState = {
      recordAudit: vi.fn(),
    } as any;

    authorization = {
      requireActor: vi.fn(),
      requireStaffPermission: vi.fn(),
      requireCompanyId: vi.fn(),
    } as any;

    requestContext = {
      requireContext: vi.fn(() => ({
        request_id: "req-order-123",
        ip: "127.0.0.1",
        market: "global",
        currency: "USD",
        actor: {
          user_id: 1,
          audience: "user",
          permissions: [],
        },
      })),
      getActor: vi.fn(() => ({
        user_id: 1,
        audience: "user",
        permissions: [],
      })),
    } as any;

    service = new OrdersService(
      stateStore,
      experience,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("listOrders", () => {
    it("普通用户查看自己的订单列表", async () => {
      const orders = {
        items: [
          {
            id: 1,
            user_id: 1,
            company_id: null,
            status: "paid",
            total_minor: 10000,
            currency: "USD",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      stateStore.listOrders.mockReturnValue(orders);

      const result = await service.listOrders({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listOrders).toHaveBeenCalledWith({
        user_id: 1,
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(orders);
    });

    it("经销商查看自己公司的订单列表", async () => {
      const orders = {
        items: [
          {
            id: 2,
            user_id: 2,
            company_id: 1,
            status: "processing",
            total_minor: 50000,
            currency: "USD",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      requestContext.getActor.mockReturnValue({
        user_id: 2,
        audience: "dealer",
        company_id: 1,
        permissions: [],
      });

      stateStore.listOrders.mockReturnValue(orders);

      const result = await service.listOrders({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listOrders).toHaveBeenCalledWith({
        company_id: 1,
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(orders);
    });
  });

  describe("getOrder", () => {
    it("用户查看自己的订单详情", async () => {
      const order = {
        id: 1,
        user_id: 1,
        company_id: null,
        status: "paid",
        total_minor: 10000,
        currency: "USD",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.getOrderById.mockReturnValue(order);

      const result = await service.getOrder(1);

      expect(stateStore.getOrderById).toHaveBeenCalledWith(1);

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: order,
      });
    });

    it("经销商查看自己公司的订单详情", async () => {
      const order = {
        id: 2,
        user_id: 2,
        company_id: 1,
        status: "processing",
        total_minor: 50000,
        currency: "USD",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 2,
        audience: "dealer",
        company_id: 1,
        permissions: [],
      });

      stateStore.getOrderById.mockReturnValue(order);

      const result = await service.getOrder(2);

      expect(stateStore.getOrderById).toHaveBeenCalledWith(2);

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: order,
      });
    });
  });

  describe("createOrder", () => {
    it("普通用户创建B2C订单", async () => {
      const pricing = {
        currency: "USD",
        items: [
          {
            variant_id: 1,
            quantity: 2,
            unit_price_minor: 5000,
            line_total_minor: 10000,
            snapshot: {},
          },
        ],
        subtotal_minor: 10000,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 10000,
      };

      const createdOrder = {
        id: 1,
        channel: "guest",
        user_id: 1,
        company_id: null,
        currency: "USD",
        subtotal_minor: 10000,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 10000,
        status: "pending_payment",
        items: [
          {
            id: 1,
            variant_id: 1,
            quantity: 2,
            unit_price_minor: 5000,
            total_minor: 10000,
          },
        ],
        request_id: "req-order-123",
      };

      stateStore.findOrderByRequestId.mockReturnValue(null);
      stateStore.previewPricing.mockReturnValue(pricing);
      stateStore.createOrder.mockReturnValue(createdOrder);
      stateStore.reserveInventory.mockReturnValue({ id: 1 });

      const result = await service.createOrder({
        channel: "b2c",
        items: [{ variant_id: 1, quantity: 2 }],
        market: "global",
        currency: "USD",
      });

      expect(stateStore.previewPricing).toHaveBeenCalledWith({
        items: [{ variant_id: 1, quantity: 2 }],
        market: "global",
        currency: "USD",
      });

      expect(stateStore.createOrder).toHaveBeenCalled();
      expect(stateStore.reserveInventory).toHaveBeenCalled();

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "orders.create",
        entity: "order",
        entity_id: 1,
        before: null,
        after: createdOrder,
        ip: "127.0.0.1",
        request_id: "req-order-123",
      });

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: createdOrder,
      });
    });

    it("经销商创建B2B订单", async () => {
      const pricing = {
        currency: "USD",
        items: [
          {
            variant_id: 1,
            quantity: 10,
            unit_price_minor: 4500,
            line_total_minor: 45000,
            snapshot: {},
          },
        ],
        subtotal_minor: 45000,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 45000,
      };

      const createdOrder = {
        id: 2,
        channel: "b2b",
        user_id: 2,
        company_id: 1,
        currency: "USD",
        subtotal_minor: 45000,
        total_minor: 45000,
        status: "pending_review",
        items: [
          {
            id: 1,
            variant_id: 1,
            quantity: 10,
            unit_price_minor: 4500,
            total_minor: 45000,
          },
        ],
        request_id: "req-order-123",
      };

      requestContext.requireContext.mockReturnValue({
        request_id: "req-order-123",
        ip: "127.0.0.1",
        market: "global",
        currency: "USD",
        actor: {
          user_id: 2,
          audience: "dealer",
          company_id: 1,
          permissions: [],
        },
      });

      stateStore.findOrderByRequestId.mockReturnValue(null);
      stateStore.previewPricing.mockReturnValue(pricing);
      stateStore.createOrder.mockReturnValue(createdOrder);
      stateStore.reserveInventory.mockReturnValue({ id: 2 });

      const result = await service.createOrder({
        channel: "b2b",
        items: [{ variant_id: 1, quantity: 10 }],
        market: "global",
        currency: "USD",
      });

      expect(stateStore.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "b2b",
          company_id: 1,
          status: "pending_review",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: createdOrder,
      });
    });

    it("幂等性：相同request_id返回已存在的订单", async () => {
      const existingOrder = {
        id: 1,
        request_id: "req-order-123",
        status: "pending_payment",
      };

      stateStore.findOrderByRequestId.mockReturnValue(existingOrder);

      const result = await service.createOrder({
        channel: "b2c",
        items: [{ variant_id: 1, quantity: 1 }],
        market: "global",
        currency: "USD",
      });

      expect(stateStore.findOrderByRequestId).toHaveBeenCalledWith(
        "req-order-123",
      );
      expect(stateStore.createOrder).not.toHaveBeenCalled();

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: existingOrder,
      });
    });
  });

  describe("updateStatus", () => {
    it("用户更新自己的订单状态", async () => {
      const beforeOrder = {
        id: 1,
        user_id: 1,
        company_id: null,
        status: "pending_payment",
      };

      const afterOrder = {
        ...beforeOrder,
        status: "cancelled",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.getOrderById.mockReturnValue(beforeOrder);
      stateStore.transitionOrder.mockReturnValue(afterOrder);

      const result = await service.updateStatus(1, {
        status: "cancelled",
        note: "用户取消订单",
      });

      expect(stateStore.transitionOrder).toHaveBeenCalledWith(
        1,
        "cancelled",
        "req-order-123",
        "用户取消订单",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "orders.status.update",
        entity: "order",
        entity_id: 1,
        before: beforeOrder,
        after: afterOrder,
        ip: "127.0.0.1",
        request_id: "req-order-123",
      });

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: afterOrder,
      });
    });

    it("员工更新订单状态", async () => {
      const beforeOrder = {
        id: 1,
        user_id: 1,
        company_id: null,
        status: "pending_payment",
      };

      const afterOrder = {
        ...beforeOrder,
        status: "paid",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["orders:write"],
      });

      stateStore.getOrderById.mockReturnValue(beforeOrder);
      stateStore.transitionOrder.mockReturnValue(afterOrder);

      const result = await service.updateStatus(1, {
        status: "paid",
      });

      expect(stateStore.transitionOrder).toHaveBeenCalledWith(
        1,
        "paid",
        "req-order-123",
        undefined,
      );

      expect(result).toMatchObject({
        request_id: "req-order-123",
        item: afterOrder,
      });
    });
  });
});
