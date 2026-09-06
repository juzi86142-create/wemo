import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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

  listCategories(query: unknown) {
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    const items = this.repository
      .listCategories({ ...parsed, status: "active" })
      .items;
    return CatalogCategoryListResponseSchema.parse(
      listResponse(items, parsed.page, parsed.page_size),
    );
  }

  listAdminCategories(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    return CatalogCategoryListResponseSchema.parse(
      this.repository.listCategories(parsed),
    );
  }

  createCategory(body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogCategoryCreateSchema, body);
    const item = this.repository.upsertCategory(input);

    return CatalogCategoryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateCategory(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogCategoryUpdateSchema, body);
    const item = this.repository.upsertCategory({
      ...(input as any),
      id: parsedId.id,
    });

    return CatalogCategoryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listProducts(query: unknown) {
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    const list = this.repository.listProducts({ ...parsed, status: "active" });
    return CatalogProductListResponseSchema.parse(list);
  }

  listAdminProducts(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    return CatalogProductListResponseSchema.parse(
      this.repository.listProducts(parsed),
    );
  }

  getProduct(slug: unknown) {
    const parsed = parseInput(CatalogSlugParamSchema, { slug });
    const product = this.repository.getProductBySlug(parsed.slug);
    if (product.status !== "active") {
      throw new NotFoundException("商品不存在");
    }
    return CatalogProductResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: product,
    });
  }

  createProduct(body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogProductCreateSchema, body);
    const item = this.repository.upsertProduct(input);

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateProduct(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogProductUpdateSchema, body);
    const before = this.repository.getProductBySlug(parsedId.id.toString());
    const item = this.repository.upsertProduct({ ...input, id: parsedId.id });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  publishProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = this.repository.getProductBySlug(parsedId.id.toString());
    const item = this.repository.upsertProduct({ ...before, status: "active" });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  archiveProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = this.repository.getProductBySlug(parsedId.id.toString());
    const item = this.repository.upsertProduct({ ...before, status: "archived" });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listVariants() {
    const items = this.repository.listVariants();
    return CatalogVariantListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}
