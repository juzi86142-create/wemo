import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

describe("CatalogController", () => {
  let controller: CatalogController;
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            listCategories: vi.fn(),
            listAdminCategories: vi.fn(),
            createCategory: vi.fn(),
            updateCategory: vi.fn(),
            listProducts: vi.fn(),
            listAdminProducts: vi.fn(),
            getProduct: vi.fn(),
            createProduct: vi.fn(),
            updateProduct: vi.fn(),
            publishProduct: vi.fn(),
            archiveProduct: vi.fn(),
            listVariants: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listCategories", () => {
    it("调用service.listCategories并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, name: "玩具车", slug: "toy-cars" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listCategories).mockReturnValue(mockResult);

      const result = await controller.listCategories({
        page: 1,
        page_size: 20,
      });

      expect(service.listCategories).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("listAdminCategories", () => {
    it("调用service.listAdminCategories并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, name: "玩具车", slug: "toy-cars" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listAdminCategories).mockReturnValue(mockResult);

      const result = await controller.listAdminCategories({
        page: 1,
        page_size: 20,
      });

      expect(service.listAdminCategories).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("createCategory", () => {
    it("调用service.createCategory并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "拼图", slug: "puzzles", status: "active" },
      };

      vi.mocked(service.createCategory).mockResolvedValue(mockResult);

      const result = await controller.createCategory({
        name: "拼图",
        slug: "puzzles",
        status: "active",
      });

      expect(service.createCategory).toHaveBeenCalledWith({
        name: "拼图",
        slug: "puzzles",
        status: "active",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateCategory", () => {
    it("调用service.updateCategory并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "玩具车系列", slug: "toy-cars" },
      };

      vi.mocked(service.updateCategory).mockResolvedValue(mockResult);

      const result = await controller.updateCategory("1", {
        name: "玩具车系列",
      });

      expect(service.updateCategory).toHaveBeenCalledWith("1", {
        name: "玩具车系列",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("listProducts", () => {
    it("调用service.listProducts并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, name: "竞速者1号", slug: "racer-1" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listProducts).mockReturnValue(mockResult);

      const result = await controller.listProducts({
        page: 1,
        page_size: 20,
      });

      expect(service.listProducts).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("listAdminProducts", () => {
    it("调用service.listAdminProducts并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, name: "竞速者1号", slug: "racer-1" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listAdminProducts).mockReturnValue(mockResult);

      const result = await controller.listAdminProducts({
        page: 1,
        page_size: 20,
      });

      expect(service.listAdminProducts).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("getProduct", () => {
    it("调用service.getProduct并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "竞速者1号", slug: "racer-1" },
      };

      vi.mocked(service.getProduct).mockResolvedValue(mockResult);

      const result = await controller.getProduct("racer-1");

      expect(service.getProduct).toHaveBeenCalledWith("racer-1");
      expect(result).toEqual(mockResult);
    });
  });

  describe("createProduct", () => {
    it("调用service.createProduct并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "竞速者1号", slug: "racer-1", status: "draft" },
      };

      vi.mocked(service.createProduct).mockResolvedValue(mockResult);

      const result = await controller.createProduct({
        name: "竞速者1号",
        slug: "racer-1",
        status: "draft",
      });

      expect(service.createProduct).toHaveBeenCalledWith({
        name: "竞速者1号",
        slug: "racer-1",
        status: "draft",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateProduct", () => {
    it("调用service.updateProduct并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "竞速者1号 Pro", slug: "racer-1" },
      };

      vi.mocked(service.updateProduct).mockResolvedValue(mockResult);

      const result = await controller.updateProduct("1", {
        name: "竞速者1号 Pro",
      });

      expect(service.updateProduct).toHaveBeenCalledWith("1", {
        name: "竞速者1号 Pro",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("publishProduct", () => {
    it("调用service.publishProduct并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "竞速者1号", slug: "racer-1", status: "active" },
      };

      vi.mocked(service.publishProduct).mockResolvedValue(mockResult);

      const result = await controller.publishProduct("1");

      expect(service.publishProduct).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockResult);
    });
  });

  describe("archiveProduct", () => {
    it("调用service.archiveProduct并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, name: "竞速者1号", slug: "racer-1", status: "archived" },
      };

      vi.mocked(service.archiveProduct).mockResolvedValue(mockResult);

      const result = await controller.archiveProduct("1");

      expect(service.archiveProduct).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockResult);
    });
  });

  describe("listVariants", () => {
    it("调用service.listVariants并返回结果", async () => {
      const mockResult = [
        { id: 1, sku: "RACER-001-RED", product_id: 1 },
        { id: 2, sku: "RACER-001-BLUE", product_id: 1 },
      ];

      vi.mocked(service.listVariants).mockReturnValue(mockResult);

      const result = await controller.listVariants();

      expect(service.listVariants).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
