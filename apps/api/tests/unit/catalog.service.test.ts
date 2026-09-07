import { describe, expect, it, vi } from "vitest";

import type { CatalogCategory, CatalogProduct } from "@wemo/contracts/catalog";
import type { ExperienceRepository } from "../../src/runtime/experience.state";
import type { PlatformRepository } from "../../src/runtime/platform-state.store";
import type { AuthorizationService } from "../../src/runtime/authorization.service";
import type { RequestContextStore } from "../../src/runtime/request-context.store";

function mockExperienceRepository(): ExperienceRepository {
  return {
    listCategories: vi.fn(async () => ({
      items: [] as CatalogCategory[],
      total: 0,
      page: 1,
      page_size: 20,
    })),
    listProducts: vi.fn(async () => ({
      items: [] as CatalogProduct[],
      total: 0,
      page: 1,
      page_size: 20,
    })),
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
    requireStaffPermission: vi.fn(() => ({ user_id: 1, audience: "staff" as const, permissions: ["catalog:read"] })),
    requireCompanyId: vi.fn(() => 1),
  } as any;
}

function mockRequestContextStore(): RequestContextStore {
  return {
    requireContext: vi.fn(() => ({
      actor: { user_id: 1, audience: "user" as const, permissions: [] },
      request_id: "test-req-id",
    })),
    getActor: vi.fn(() => ({ user_id: 1, audience: "user" as const, permissions: [] })),
  } as any;
}

describe("CatalogService", () => {
  it("listCategories 返回分页结果", async () => {
    const { CatalogService } = await import("../../src/modules/catalog/catalog.service");
    const service = new CatalogService(
      mockExperienceRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.listCategories({ page: 1, page_size: 20 });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("page_size");
  });

  it("listProducts 返回分页结果", async () => {
    const { CatalogService } = await import("../../src/modules/catalog/catalog.service");
    const service = new CatalogService(
      mockExperienceRepository(),
      mockPlatformRepository(),
      mockAuthorizationService(),
      mockRequestContextStore(),
    );

    const result = await service.listProducts({ page: 1, page_size: 20 });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});
