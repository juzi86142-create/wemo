import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../../runtime/request-context.store";
import type { ExperienceStateStore } from "../../../runtime/experience.state";
import type { PlatformStateStore } from "../../../runtime/platform-state.store";
import type { AuthorizationService } from "../../../runtime/authorization.service";
import { CatalogService } from "./catalog.service";

describe("CatalogService", () => {
  let service: CatalogService;
  let stateStore: ExperienceStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      listCategories: vi.fn(),
      upsertCategory: vi.fn(),
      listProducts: vi.fn(),
      getProductBySlug: vi.fn(),
      upsertProduct: vi.fn(),
      listVariants: vi.fn(),
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
        request_id: "req-catalog-123",
        ip: "127.0.0.1",
        actor: {
          user_id: 1,
          audience: "staff",
          permissions: ["catalog:write"],
        },
      })),
    } as any;

    service = new CatalogService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("listCategories", () => {
    it("列出公开的分类列表", async () => {
      const categories = {
        items: [
          {
            id: 1,
            name: "玩具车",
            slug: "toy-cars",
            status: "active",
          },
          {
            id: 2,
            name: "积木",
            slug: "building-blocks",
            status: "active",
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      stateStore.listCategories.mockReturnValue({
        items: categories.items,
        total: 2,
        page: 1,
        page_size: 20,
      });

      const result = await service.listCategories({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listCategories).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        status: "active",
      });

      expect(result).toMatchObject({
        items: categories.items,
        total: 2,
        page: 1,
        page_size: 20,
      });
    });
  });

  describe("listAdminCategories", () => {
    it("员工查看全部分类列表", async () => {
      const categories = {
        items: [
          {
            id: 1,
            name: "玩具车",
            slug: "toy-cars",
            status: "active",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:read"],
      });

      stateStore.listCategories.mockReturnValue({
        items: categories.items,
        total: 1,
        page: 1,
        page_size: 20,
      });

      const result = await service.listAdminCategories({
        page: 1,
        page_size: 20,
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "catalog:read",
      );
      expect(stateStore.listCategories).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(categories);
    });
  });

  describe("createCategory", () => {
    it("创建新分类", async () => {
      const newCategory = {
        id: 3,
        name: "拼图",
        slug: "puzzles",
        status: "active",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:write"],
      });

      stateStore.upsertCategory.mockReturnValue(newCategory);

      const result = await service.createCategory({
        name: "拼图",
        slug: "puzzles",
        status: "active",
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "catalog:write",
      );
      expect(stateStore.upsertCategory).toHaveBeenCalledWith({
        name: "拼图",
        slug: "puzzles",
        status: "active",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "catalog.category.create",
        entity: "catalog_category",
        entity_id: 3,
        before: null,
        after: newCategory,
        ip: "127.0.0.1",
        request_id: "req-catalog-123",
      });

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: newCategory,
      });
    });
  });

  describe("updateCategory", () => {
    it("更新现有分类", async () => {
      const updatedCategory = {
        id: 1,
        name: "玩具车系列",
        slug: "toy-cars",
        status: "active",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:write"],
      });

      stateStore.listCategories.mockReturnValue({
        items: [{ id: 1, name: "玩具车" }],
        total: 1,
        page: 1,
        page_size: 1,
      });

      stateStore.upsertCategory.mockReturnValue(updatedCategory);

      const result = await service.updateCategory(1, {
        name: "玩具车系列",
      });

      expect(stateStore.upsertCategory).toHaveBeenCalledWith({
        id: 1,
        name: "玩具车系列",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "catalog.category.update",
          entity: "catalog_category",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: updatedCategory,
      });
    });
  });

  describe("listProducts", () => {
    it("列出公开的商品列表", async () => {
      const products = {
        items: [
          {
            id: 1,
            name: "竞速者1号",
            slug: "racer-1",
            status: "active",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      stateStore.listProducts.mockReturnValue({
        items: products.items,
        total: 1,
        page: 1,
        page_size: 20,
      });

      const result = await service.listProducts({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listProducts).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        status: "active",
      });

      expect(result).toMatchObject(products);
    });
  });

  describe("getProduct", () => {
    it("通过slug获取商品详情", async () => {
      const product = {
        id: 1,
        name: "竞速者1号",
        slug: "racer-1",
        status: "active",
      };

      stateStore.getProductBySlug.mockReturnValue(product);

      const result = await service.getProduct("racer-1");

      expect(stateStore.getProductBySlug).toHaveBeenCalledWith("racer-1");

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: product,
      });
    });
  });

  describe("createProduct", () => {
    it("创建新商品", async () => {
      const newProduct = {
        id: 1,
        name: "竞速者1号",
        slug: "racer-1",
        status: "draft",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:write"],
      });

      stateStore.upsertProduct.mockReturnValue(newProduct);

      const result = await service.createProduct({
        name: "竞速者1号",
        slug: "racer-1",
        status: "draft",
      });

      expect(stateStore.upsertProduct).toHaveBeenCalledWith({
        name: "竞速者1号",
        slug: "racer-1",
        status: "draft",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "catalog.product.create",
          entity: "catalog_product",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: newProduct,
      });
    });
  });

  describe("publishProduct", () => {
    it("发布商品", async () => {
      const publishedProduct = {
        id: 1,
        name: "竞速者1号",
        slug: "racer-1",
        status: "active",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:write"],
      });

      stateStore.upsertProduct.mockReturnValue(publishedProduct);

      const result = await service.publishProduct(1);

      expect(stateStore.upsertProduct).toHaveBeenCalledWith({
        id: 1,
        status: "active",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "catalog.product.publish",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: publishedProduct,
      });
    });
  });

  describe("archiveProduct", () => {
    it("归档商品", async () => {
      const archivedProduct = {
        id: 1,
        name: "竞速者1号",
        slug: "racer-1",
        status: "archived",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 1,
        audience: "staff",
        permissions: ["catalog:write"],
      });

      stateStore.upsertProduct.mockReturnValue(archivedProduct);

      const result = await service.archiveProduct(1);

      expect(stateStore.upsertProduct).toHaveBeenCalledWith({
        id: 1,
        status: "archived",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "catalog.product.archive",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-catalog-123",
        item: archivedProduct,
      });
    });
  });

  describe("listVariants", () => {
    it("列出所有变体(SKU)", async () => {
      const variants = [
        { id: 1, sku: "RACER-001-RED", product_id: 1 },
        { id: 2, sku: "RACER-001-BLUE", product_id: 1 },
      ];

      stateStore.listVariants.mockReturnValue(variants);

      const result = await service.listVariants();

      expect(stateStore.listVariants).toHaveBeenCalled();
      expect(result).toEqual(variants);
    });
  });
});
