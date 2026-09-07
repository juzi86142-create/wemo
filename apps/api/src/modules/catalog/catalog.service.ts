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
import { ExperienceRepository } from "../../runtime/experience.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceRepository)
    private readonly stateStore: ExperienceRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listCategories(query: unknown) {
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    const items = (await this.stateStore
      .listCategories({ ...parsed, status: "active" }))
      .items;
    return CatalogCategoryListResponseSchema.parse(
      listResponse(items, parsed.page, parsed.page_size),
    );
  }

  async listAdminCategories(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogCategoryListQuerySchema, query);
    return CatalogCategoryListResponseSchema.parse(
      await this.stateStore.listCategories(parsed),
    );
  }

  async createCategory(body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogCategoryCreateSchema, body);
    const item = await this.stateStore.upsertCategory(input);

    await this.platformState.recordAudit({
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

  async updateCategory(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogCategoryUpdateSchema, body);
    const before = (await this.stateStore.listCategories({ page: 1, page_size: 100 })).items.find(
      (category) => category.id === parsedId.id,
    );
    const item = await this.stateStore.upsertCategory({
      ...(input as any),
      id: parsedId.id,
    });

    await this.platformState.recordAudit({
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

  async listProducts(query: unknown) {
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    const list = await this.stateStore.listProducts({ ...parsed, status: "active" });
    return CatalogProductListResponseSchema.parse(list);
  }

  async listAdminProducts(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    return CatalogProductListResponseSchema.parse(
      await this.stateStore.listProducts(parsed),
    );
  }

  async getProduct(slug: unknown) {
    const parsed = parseInput(CatalogSlugParamSchema, { slug });
    const product = await this.stateStore.getProductBySlug(parsed.slug);
    if (product.status !== "active") {
      throw new NotFoundException("商品不存在");
    }
    return CatalogProductResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: product,
    });
  }

  async createProduct(body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CatalogProductCreateSchema, body);
    const item = await this.stateStore.upsertProduct(input);

    await this.platformState.recordAudit({
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

  async updateProduct(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const input = parseInput(CatalogProductUpdateSchema, body);
    const before = await this.stateStore.getProductById(parsedId.id);
    const item = await this.stateStore.upsertProduct({ ...input, id: parsedId.id });

    await this.platformState.recordAudit({
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

  async publishProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = await this.stateStore.getProductById(parsedId.id);
    const item = await this.stateStore.publishProduct(parsedId.id);

    await this.platformState.recordAudit({
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

  async archiveProduct(id: unknown) {
    const actor = this.authorization.requireStaffPermission("catalog:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CatalogIdParamSchema, { id });
    const before = await this.stateStore.getProductById(parsedId.id);
    const item = await this.stateStore.archiveProduct(parsedId.id);

    await this.platformState.recordAudit({
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

  async listVariants() {
    const variants = await this.stateStore.listVariants();
    const items = [] as typeof variants;
    for (const variant of variants) {
      const product = await this.stateStore.getProductById(variant.product_id);
      if (variant.status === "active" && product.status === "active") items.push(variant);
    }
    return CatalogVariantListResponseSchema.parse(
      listResponse(items, 1, Math.max(items.length, 1)),
    );
  }
}

