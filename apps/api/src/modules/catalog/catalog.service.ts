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
import {
  DealerCatalogListResponseSchema,
  DealerQuickOrderInputSchema,
  DealerQuickOrderResponseSchema,
  type PricingPreviewRequest,
} from "@wemo/contracts/commerce";
import { EntityIdSchema, PaginationSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { paginate } from "../../runtime/pagination";
import { CatalogPrismaRepository } from "./catalog.prisma-repository";
import { CATALOG_REPOSITORY } from "./catalog.repository";
import { PRICING_REPOSITORY } from "../pricing/pricing.repository";
import { PricingPrismaRepository } from "../pricing/pricing.prisma-repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { listResponse } from "../../runtime/list-response";
import { parseInput } from "../../runtime/validation";

const CatalogSlugParamSchema = z.object({
  slug: z.string().min(1),
});

const CatalogIdParamSchema = z.object({
  id: EntityIdSchema,
});

function asSpecifications(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readPositiveInt(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const raw = record[key];
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0
    ? raw
    : null;
}

/** 粘贴文本解析 每行 SKU 与数量 支持空格或逗号分隔 */
function parseQuickOrderText(
  text: string,
): Array<{ sku: string; quantity: number }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.toUpperCase().startsWith("SKU"))
    .flatMap((line) => {
      const parts = line.split(/[\s,]+/).filter((part) => part.length > 0);
      if (parts.length < 2) return [];
      const quantity = Number(parts[parts.length - 1]);
      if (!Number.isInteger(quantity) || quantity <= 0) return [];
      return [{ sku: parts.slice(0, -1).join("-"), quantity }];
    });
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogPrismaRepository,
    @Inject(PRICING_REPOSITORY)
    private readonly pricingRepository: PricingPrismaRepository,
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
    const context = this.requestContext.requireContext();
    const list = await this.repository.listProducts({
      ...parsed,
      status: "active",
      market: parsed.market ?? context.market,
      locale: parsed.locale ?? context.locale,
    });
    return CatalogProductListResponseSchema.parse(list);
  }

  async listAdminProducts(query: unknown) {
    this.authorization.requireStaffPermission("catalog:read");
    const parsed = parseInput(CatalogProductListQuerySchema, query);
    const context = this.requestContext.requireContext();
    return CatalogProductListResponseSchema.parse(
      await this.repository.listProducts({
        ...parsed,
        market: parsed.market ?? context.market,
        locale: parsed.locale ?? context.locale,
      }),
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

  /** 快速下单解析 按 SKU 解析行 逐行校验授权/MOQ/库存并提示错误 */
  async quickOrder(body: unknown) {
    const companyId = this.authorization.requireCompanyId();
    const context = this.requestContext.requireContext();
    const input = parseInput(DealerQuickOrderInputSchema, body);
    const lines = input.lines ?? parseQuickOrderText(input.text ?? "");

    const companyContext =
      await this.repository.getDealerCatalogContext(companyId);
    if (!companyContext) {
      throw new NotFoundException("经销商企业不存在");
    }
    const authorizedSlugs = companyContext.authorized_category_slugs;
    const authorized =
      authorizedSlugs.length > 0 ? new Set(authorizedSlugs) : null;

    const rows = await Promise.all(
      lines.map((line) => this.repository.getVariantBySku(line.sku)),
    );

    const foundRows = rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );
    const stockByVariant =
      foundRows.length > 0
        ? await this.repository.getAvailableStock(
            foundRows.map((row) => row.variant_id),
            context.market,
          )
        : new Map<number, number>();

    const categories = new Map<number, string>();
    if (authorized) {
      const allCategories = await this.repository.listCategories({
        page: 1,
        page_size: 100,
      });
      for (const category of allCategories.items) {
        categories.set(category.id, category.slug);
      }
    }

    const pricePreview =
      foundRows.length > 0
        ? await this.pricingRepository.previewPricing({
            items: foundRows.map((row) => ({
              variant_id: row.variant_id,
              quantity: 1,
            })),
            market: context.market,
            currency: companyContext.currency,
            dealer_company_id: companyId,
            dealer_tier_id: companyContext.tier_id ?? undefined,
            price_list_id: companyContext.price_list_id ?? undefined,
          })
        : { items: [] };
    const priceByVariant = new Map(
      pricePreview.items.map((item) => [item.variant_id, item]),
    );

    const results = lines.map((line, index) => {
      const row = rows[index];
      const errors: string[] = [];
      if (!row) {
        errors.push(`SKU ${line.sku} 不存在或已停售`);
      } else if (authorized && !categories.has(row.category_id)) {
        errors.push("未授权的商品分类");
      } else if (
        authorized &&
        row.category_id &&
        !authorized.has(categories.get(row.category_id) ?? "")
      ) {
        errors.push("未授权的商品分类");
      } else {
        const price = priceByVariant.get(row.variant_id);
        const moq = price?.min_quantity ?? 1;
        if (line.quantity < moq) {
          errors.push(`低于最小起订量 ${moq}`);
        }
        const available = stockByVariant.get(row.variant_id) ?? 0;
        if (line.quantity > available) {
          errors.push(`库存不足 可订 ${available}`);
        }
      }
      const price = row ? priceByVariant.get(row.variant_id) : undefined;
      return {
        line_no: index + 1,
        sku: line.sku,
        quantity: line.quantity,
        variant_id: row?.variant_id ?? null,
        name: row?.name ?? null,
        dealer_price_minor: price?.unit_price_minor ?? null,
        currency: price?.currency ?? null,
        moq: price?.min_quantity ?? null,
        errors,
      };
    });

    return DealerQuickOrderResponseSchema.parse({
      request_id: context.request_id,
      item: {
        lines: results,
        valid_count: results.filter((line) => line.errors.length === 0).length,
      },
    });
  }

  /** 经销商目录 授权分类过滤 按公司计价 叠加库存档位 */
  async dealerCatalog(query: unknown) {
    const companyId = this.authorization.requireCompanyId();
    const context = this.requestContext.requireContext();
    const parsed = parseInput(PaginationSchema, query);

    const companyContext =
      await this.repository.getDealerCatalogContext(companyId);
    if (!companyContext) {
      throw new NotFoundException("经销商企业不存在");
    }

    const rows = await this.repository.listDealerCatalogBase({
      market: context.market,
      locale: context.locale,
      categorySlugs: companyContext.authorized_category_slugs,
    });

    const itemsInput: PricingPreviewRequest["items"] = rows.map((row) => ({
      variant_id: row.variant_id,
      quantity: 1,
    }));
    const previewOptions = {
      items: itemsInput,
      market: context.market,
      currency: companyContext.currency,
    };
    const [retailPrices, dealerPrices, stockByVariant] = await Promise.all([
      this.pricingRepository.previewPricing(previewOptions),
      this.pricingRepository.previewPricing({
        ...previewOptions,
        dealer_company_id: companyId,
        dealer_tier_id: companyContext.tier_id ?? undefined,
        price_list_id: companyContext.price_list_id ?? undefined,
      }),
      this.repository.getAvailableStock(
        rows.map((row) => row.variant_id),
        context.market,
      ),
    ]);

    const retailByVariant = new Map(
      retailPrices.items.map((item) => [item.variant_id, item]),
    );
    const dealerByVariant = new Map(
      dealerPrices.items.map((item) => [item.variant_id, item]),
    );

    const items = rows.map((row) => {
      const dealerPrice = dealerByVariant.get(row.variant_id) ?? null;
      const retailPrice = retailByVariant.get(row.variant_id) ?? null;
      const specifications = asSpecifications(row.specifications);
      const available = stockByVariant.get(row.variant_id) ?? 0;
      const stockBand =
        available <= 0
          ? ("out_of_stock" as const)
          : available < 10
            ? ("low_stock" as const)
            : ("in_stock" as const);
      return {
        product_id: row.product_id,
        slug: row.slug,
        name: row.name,
        variant_id: row.variant_id,
        sku: row.sku,
        retail_price_minor: retailPrice?.unit_price_minor ?? null,
        dealer_price_minor: dealerPrice?.unit_price_minor ?? null,
        currency: companyContext.currency,
        price_type: dealerPrice?.price_type ?? "default",
        valid_from: dealerPrice?.valid_from ?? null,
        valid_to: dealerPrice?.valid_to ?? null,
        moq: dealerPrice?.min_quantity ?? 1,
        case_pack: readPositiveInt(specifications, "case_pack"),
        lead_time_days: readPositiveInt(specifications, "lead_time_days"),
        stock_band: stockBand,
      };
    });

    return DealerCatalogListResponseSchema.parse(
      paginate(items, { page: parsed.page, page_size: parsed.page_size }),
    );
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
    return CatalogVariantListResponseSchema.parse(listResponse(items, 1));
  }
}
