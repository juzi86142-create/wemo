import { describe, expect, it, vi } from "vitest";

import type { Order } from "@wemo/contracts/commerce";
import type { CommerceRepository } from "../../src/runtime/commerce.state";
import type { ExperienceRepository } from "../../src/runtime/experience.state";
import type { PlatformRepository } from "../../src/runtime/platform-state.store";
import type { AuthorizationService } from "../../src/runtime/authorization.service";
import type { RequestContextStore } from "../../src/runtime/request-context.store";

function mockCommerceRepository(): CommerceRepository {
  return {
    listOrders: vi.fn(async () => ({
      items: [] as Order[],
      total: 0,
      page: 1,
      page_size: 20,
    })),
    getOrderById: vi.fn(async () => ({
      id: 1,
      order_no: "ORD-001",
      user_id: 1,
      company_id: null,
      channel: "b2c",
      currency: "CNY",
      status: "pending_payment",
      subtotal_minor: 10000,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 10000,
      items: [],
      address_snapshot: {},
      pricing_snapshot: {},
      status_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Order)),
  } as any;
}

function mockExperienceRepository(): ExperienceRepository {
  return {
    listCategories: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 20 })),
    listProducts: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 20 })),
  } as any;
}

function mockPlatformRepository(): PlatformRepository {
  return {
    listSettings: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 20 })),
  } as any;
}

function mockAuthorizationService(): AuthorizationService {
  return {
    requireActor: vi.fn(() => ({ user_id: 1, audience: "user" as const, permissions: [] })),
    requireAudience: vi.fn(() => ({ user_id: 1, audience: "user" as const, permissions: [] })),
    requirePermission: vi.fn(() => ({ user_id: 1, audience: "user" as const, permissions: [] })),
    requireStaffPermission: vi.fn(() => ({ user_id: 1, audience: "staff" as const, permissions: ["orders:read"] })),
    requireCompanyId: vi.fn(() => 1),
  } as any;
}

function mockRequestContextStore(): RequestContextStore {
  return {
    requireContext: vi.fn(() => ({
      actor: { user_id: 1, audience: "user" as const, permissions: [] },
      market: "CN",
      currency: "CNY",
      request_id: "test-req-id",
    })),
    getActor: vi.fn(() => ({ user_id: 1, audience: "user" as const, permissions: [] })),
  } as any;
}

describe("OrdersService", () => {
  it("listOrders 返回分页结果", async () => {
    const { OrdersService } = await import("../../src/modules/orders/orders.service");
    const service = new OrdersService(
      mockCommerceRepository(),
      mockExperienceRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.listOrders({ page: 1, page_size: 20 });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("page_size");
  });

  it("getOrder 返回订单详情", async () => {
    const { OrdersService } = await import("../../src/modules/orders/orders.service");
    const service = new OrdersService(
      mockCommerceRepository(),
      mockExperienceRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.getOrder(1);

    // 结果应该是有效的订单对象
    expect(result).toHaveProperty("item");
    expect(result.item).toHaveProperty("id");
    expect(result.item).toHaveProperty("order_no");
  });
});
