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
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceStateStore)
    private readonly stateStore: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listCategories(query: unknown) {
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    const items = this.stateStore
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
      this.stateStore.listCategories(parsed),
    );
  }

  createCategory(body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogCategoryCreateSchema, body);
    const item = this.stateStore.upsertCategory(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.category.create",
      entity: "catalog_category",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

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
    const before = this.stateStore.listCategories({ page: 1, page_size: 1 }).items.find(
      (category) => category.id === parsedId.id,
    );
    const item = this.stateStore.upsertCategory({
      ...(input as any),
      id: parsedId.id,
    });

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.category.update",
      entity: "catalog_category",
      entity_id: item.id,
      before: before ?? null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return CatalogCategoryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listProducts(query: unknown) {
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    const list = this.stateStore.listProducts({ ...parsed, status: "active" });
    return CatalogProductListResponseSchema.parse(list);
  }

  listAdminProducts(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    return CatalogProductListResponseSchema.parse(
      this.stateStore.listProducts(parsed),
    );
  }

  getProduct(slug: unknown) {
    const parsed = parseInput(CatalogSlugParamSchema, { slug });
    const product = this.stateStore.getProductBySlug(parsed.slug);
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
    const item = this.stateStore.upsertProduct(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.product.create",
      entity: "catalog_product",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

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
    const before = this.stateStore.getProductById(parsedId.id);
    const item = this.stateStore.upsertProduct({ ...input, id: parsedId.id });

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.product.update",
      entity: "catalog_product",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  publishProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = this.stateStore.getProductById(parsedId.id);
    const item = this.stateStore.publishProduct(parsedId.id);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.product.publish",
      entity: "catalog_product",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  archiveProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = this.stateStore.getProductById(parsedId.id);
    const item = this.stateStore.archiveProduct(parsedId.id);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "catalog.product.archive",
      entity: "catalog_product",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return CatalogProductMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listVariants() {
    const items = this.stateStore
      .listVariants()
      .filter((variant) => {
        const product = this.stateStore.getProductById(variant.product_id);
        return variant.status === "active" && product.status === "active";
      });
    return CatalogVariantListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}
