import { describe, expect, it, vi } from "vitest";

import type { IdentityRole } from "@wemo/contracts/identity";
import type { IdentityRepository } from "../../src/modules/identity/identity.state";
import type { PlatformRepository } from "../../src/runtime/platform-state.store";
import type { AuthorizationService } from "../../src/runtime/authorization.service";
import type { RequestContextStore } from "../../src/runtime/request-context.store";

function mockIdentityRepository(): IdentityRepository {
  return {
    getUserById: vi.fn(async () => ({
      id: 1,
      email: "test@example.com",
      name: "Test User",
      audience: "user" as const,
      status: "active" as const,
      phone: "+86-138-0000-0000",
      locale: "zh-CN",
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    listAddresses: vi.fn(async () => []),
    listSubscriptions: vi.fn(async () => []),
    listRoles: vi.fn(async () => []),
    getDealerContextForUser: vi.fn(async () => null),
  } as any;
}

function mockPlatformRepository(): PlatformRepository {
  return {
    listSettings: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 20 })),
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
      permissions: ["identity:manage"],
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

describe("IdentityService", () => {
  it("getProfile 返回用户档案", async () => {
    const { IdentityService } = await import("../../src/modules/identity/identity.service");
    const service = new IdentityService(
      mockIdentityRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.getProfile();

    expect(result).toHaveProperty("item");
    expect(result.item).toHaveProperty("user");
    expect(result.item).toHaveProperty("permissions");
    expect(result.item).toHaveProperty("addresses");
  });

  it("listRoles 返回角色列表", async () => {
    const { IdentityService } = await import("../../src/modules/identity/identity.service");
    const service = new IdentityService(
      mockIdentityRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.listRoles();

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});
