import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CatalogCategoryCreateSchema,
  CatalogCategoryListQuerySchema,
  CatalogCategoryListResponseSchema,
  CatalogCategoryMutationResponseSchema,
  CatalogCategoryUpdateSchema,
  CatalogProductCreateSchema,
  CatalogProductListQuerySchema,
  CatalogProductListResponseSchema,
  CatalogProductMutationResponseSchema,
  CatalogProductUpdateSchema,
  CatalogVariantListResponseSchema,
  CatalogProductResponseSchema,
} from "@wemo/contracts/catalog";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CatalogPrismaRepository } from "./catalog.prisma-repository";
import { CATALOG_REPOSITORY } from "./catalog.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { listResponse } from "../../runtime/list-response";
import { parseInput } from "../../runtime/validation";

const CatalogSlugParamSchema = z.object({
  slug: z.string().min(1),
});

const CatalogIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listCategories(query: unknown) {
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    const page = await this.repository.listCategories({
      ...parsed,
      status: "active",
    });
    return CatalogCategoryListResponseSchema.parse(
      listResponse(page.items, page.page, page.page_size),
    );
  }

  async listAdminCategories(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    return CatalogCategoryListResponseSchema.parse(
      await this.repository.listCategories(parsed),
    );
  }

  async createCategory(body: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogCategoryCreateSchema, body);
    const item = await this.repository.upsertCategory(input);

    return CatalogCategoryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateCategory(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogCategoryUpdateSchema, body);
    const item = await this.repository.upsertCategory({
      ...(input as any),
      id: parsedId.id,
    });

    return CatalogCategoryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listProducts(query: unknown) {
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    const list = await this.repository.listProducts({
      ...parsed,
      status: "active",
    });
    return CatalogProductListResponseSchema.parse(list);
  }

  async listAdminProducts(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    return CatalogProductListResponseSchema.parse(
      await this.repository.listProducts(parsed),
    );
  }

  async getProduct(slug: unknown) {
    const parsed = parseInput(CatalogSlugParamSchema, { slug });
    const product = await this.repository.getProductBySlug(parsed.slug);
    if (!product || product.status !== "active") {
      throw new NotFoundException("商品不存在");
    }
    return CatalogProductResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: product,
    });
  }

  async createProduct(body: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogProductCreateSchema, body);
    const item = await this.repository.upsertProduct(input as any);

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateProduct(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogProductUpdateSchema, body);
    const item = await this.repository.upsertProduct({
      ...input,
      id: parsedId.id,
    } as any);

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async publishProduct(id: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const item = await this.repository.upsertProduct({
      id: parsedId.id,
      status: "active",
    } as any);

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async archiveProduct(id: unknown) {
    this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const item = await this.repository.upsertProduct({
      id: parsedId.id,
      status: "archived",
    } as any);

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listVariants() {
    const items = await this.repository.listVariants();
    return CatalogVariantListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}
