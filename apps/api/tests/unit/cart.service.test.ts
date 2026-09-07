import { describe, expect, it, vi } from "vitest";

import type { Cart, CartItem } from "@wemo/contracts/commerce";
import type { CommerceRepository } from "../../src/runtime/commerce.state";
import type { AuthorizationService } from "../../src/runtime/authorization.service";
import type { RequestContextStore } from "../../src/runtime/request-context.store";

function mockCommerceRepository(): CommerceRepository {
  return {
    getOrCreateCart: vi.fn(async () => ({
      id: 1,
      user_id: 1,
      company_id: null,
      channel: "guest",
      market: "US",
      currency: "USD",
      status: "active",
      items: [],
      subtotal_minor: 0,
      total_minor: 0,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Cart)),
    listCarts: vi.fn(async () => ({
      items: [] as Cart[],
      total: 0,
      page: 1,
      page_size: 20,
    })),
    addCartItem: vi.fn(async () => ({
      id: 1,
      cart_id: 1,
      variant_id: 1,
      quantity: 1,
    } as CartItem)),
    removeCartItem: vi.fn(async () => true),
    mergeCart: vi.fn(async () => ({
      id: 1,
      items: [],
      status: "active",
    } as Cart)),
  } as any;
}

function mockAuthorizationService(): AuthorizationService {
  return {
    requireActor: vi.fn(() => ({
      user_id: 1,
      audience: "user" as const,
      permissions: [],
    })),
    requireAudience: vi.fn(() => ({
      user_id: 1,
      audience: "user" as const,
      permissions: [],
    })),
    requirePermission: vi.fn(() => ({
      user_id: 1,
      audience: "user" as const,
      permissions: [],
    })),
    requireStaffPermission: vi.fn(() => ({
      user_id: 1,
      audience: "staff" as const,
      permissions: ["cart:read"],
    })),
    requireCompanyId: vi.fn(() => 1),
  } as any;
}

function mockRequestContextStore(): RequestContextStore {
  return {
    requireContext: vi.fn(() => ({
      actor: { user_id: 1, audience: "user" as const, permissions: [] },
      market: "US",
      currency: "USD",
      request_id: "test-req-id",
    })),
    getActor: vi.fn(() => ({
      user_id: 1,
      audience: "user" as const,
      permissions: [],
    })),
  } as any;
}

describe("CartService", () => {
  it("getCurrent 返回购物车", async () => {
    const { CartService } = await import("../../src/modules/cart/cart.service");
    const service = new CartService(
      mockCommerceRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.getCurrent({});

    expect(result).toHaveProperty("item");
    expect(result.item).toHaveProperty("id");
    expect(result.item).toHaveProperty("status");
  });

  it("listCarts 返回购物车列表", async () => {
    const { CartService } = await import("../../src/modules/cart/cart.service");
    const service = new CartService(
      mockCommerceRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.listCarts({ page: 1, page_size: 20 });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});
