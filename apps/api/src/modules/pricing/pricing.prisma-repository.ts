import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  PricingPreviewRequest,
  PricingRecord,
  PricingRecordListQuery,
} from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  type Page,
  type PricePreview,
  type PricePreviewItem,
  type PriceListSummary,
  type PriceRecordCreateInput,
  type PricingRepository,
} from "./pricing.repository";

type PriceRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["price"]["findFirst"]>>
>;

/** Prisma 写入端 rules 字段接受的类型（区别于读取端输出的 JsonValue）。 */
type PriceRulesWriteValue = Parameters<
  DatabaseClient["price"]["create"]
>[0]["data"]["rules"];

function toIso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/** valid_from / valid_to：字符串 -> Date，null/undefined -> null（null 表示无日期限制）。 */
function toDateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

@Injectable()
export class PricingPrismaRepository implements PricingRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async previewPricing(input: PricingPreviewRequest): Promise<PricePreview> {
    const variantIds = [...new Set(input.items.map(item => item.variant_id))];
    const now = new Date();

    const prices = await this.database.price.findMany({
      where: {
        variantId: { in: variantIds },
        ...(input.market !== undefined ? { market: input.market } : {}),
        currency: input.currency,
        ...(input.dealer_company_id !== undefined
          ? { dealerCompanyId: input.dealer_company_id }
          : {}),
        ...(input.dealer_tier_id !== undefined
          ? { dealerTierId: input.dealer_tier_id }
          : {}),
        ...(input.price_list_id !== undefined
          ? { priceListId: input.price_list_id }
          : {}),
        // 只取当前有效期内的价格记录 未设置起止视为永久有效
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const byVariant = new Map<number, PriceRow[]>();
    for (const price of prices) {
      const bucket = byVariant.get(price.variantId);
      if (bucket) bucket.push(price);
      else byVariant.set(price.variantId, [price]);
    }

    const items: PricePreviewItem[] = input.items.map(item => {
      const price = this.pickPrice(byVariant.get(item.variant_id) ?? [], {
        ...input,
        quantity: item.quantity,
      });
      const unitPrice = price?.amountMinor ?? 0;
      return {
        variant_id: item.variant_id,
        quantity: item.quantity,
        // 币种以请求为准 价格记录仅在同币种内筛选
        currency: input.currency,
        price_type: price?.priceType ?? "default",
        price_record_id: price?.id ?? 0,
        dealer_company_id: price?.dealerCompanyId ?? null,
        dealer_tier_id: price?.dealerTierId ?? null,
        price_list_id: price?.priceListId ?? null,
        unit_price_minor: unitPrice,
        line_total_minor: unitPrice * item.quantity,
        min_quantity: price?.minQuantity ?? 1,
        valid_from: toIso(price?.validFrom ?? null),
        valid_to: toIso(price?.validTo ?? null),
        snapshot: price
          ? {
              id: price.id,
              market: price.market,
              currency: price.currency,
              price_type: price.priceType,
              min_quantity: price.minQuantity,
            }
          : {},
      };
    });

    return {
      currency: input.currency,
      subtotal_minor: items.reduce((sum, item) => sum + item.line_total_minor, 0),
      source: "price_table",
      items,
    };
  }

  async listPriceRecords(
    query: PricingRecordListQuery,
  ): Promise<Page<PricingRecord>> {
    const page = query.page;
    const pageSize = query.page_size;
    const where = {
      ...(query.variant_id !== undefined ? { variantId: query.variant_id } : {}),
      ...(query.market !== undefined ? { market: query.market } : {}),
      ...(query.currency !== undefined ? { currency: query.currency } : {}),
      ...(query.price_type !== undefined ? { priceType: query.price_type } : {}),
    };

    const [records, total] = await Promise.all([
      this.database.price.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.database.price.count({ where }),
    ]);

    return {
      items: records.map(record => this.mapPriceRecord(record)),
      total,
      page,
      page_size: pageSize,
    };
  }

  async createPriceRecord(input: PriceRecordCreateInput): Promise<PricingRecord> {
    if (input.id !== undefined) {
      const existing = await this.database.price.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new NotFoundException(`price record ${input.id} 不存在`);
      }
      const updated = await this.database.price.update({
        where: { id: input.id },
        data: this.buildPriceData(input, existing),
      });
      return this.mapPriceRecord(updated);
    }

    const created = await this.database.price.create({
      data: this.buildPriceData(input),
    });
    return this.mapPriceRecord(created);
  }

  async listPriceLists(): Promise<PriceListSummary[]> {
    const priceLists = await this.database.priceList.findMany({
      where: { status: "active" },
      orderBy: { code: "asc" },
    });
    return priceLists.map(pl => ({
      id: pl.id,
      code: pl.code,
      name: pl.name,
      market: pl.market,
      currency: pl.currency,
    }));
  }

  /**
   * 确定性取价 需求 6.4/9.2：企业专属 > 企业价格表 > 经销商等级价 > 默认 B2B（三个维度均为空）> 任意一条。
   * dealer_company_id / dealer_tier_id / price_list_id 未提供时，对应档位不作为候选。
   */
  private pickPrice(
    candidates: PriceRow[],
    input: {
      dealer_company_id?: number | undefined;
      dealer_tier_id?: number | undefined;
      price_list_id?: number | undefined;
      quantity: number;
    },
  ): PriceRow | null {
    if (candidates.length === 0) return null;
    const matchers: Array<(price: PriceRow) => boolean> = [
      price =>
        input.dealer_company_id !== undefined &&
        price.dealerCompanyId === input.dealer_company_id,
      price =>
        input.price_list_id !== undefined &&
        price.priceListId === input.price_list_id,
      price =>
        input.dealer_tier_id !== undefined &&
        price.dealerTierId === input.dealer_tier_id,
      price =>
        price.dealerCompanyId === null &&
        price.dealerTierId === null &&
        price.priceListId === null,
    ];
    for (const matches of matchers) {
      const tier = candidates.filter(matches);
      if (tier.length === 0) continue;
      // 阶梯价按采购数量选档 取满足数量的最高档 需求 6.4/9.2
      const applicable = tier.filter(
        price => price.minQuantity <= input.quantity,
      );
      const hit = applicable.sort((a, b) => b.minQuantity - a.minQuantity)[0];
      return hit ?? null;
    }
    return candidates[0] ?? null;
  }

  private buildPriceData(
    input: PriceRecordCreateInput,
    existing?: PriceRow | null,
  ) {
    // 契约要求 market/currency/variant_id 必填 update 直接覆盖写入
    return {
      variantId: input.variant_id,
      market: input.market,
      currency: input.currency,
      priceType: input.price_type,
      amountMinor: input.amount_minor,
      // update 未携带的字段保留原值 这是明确的 upsert 语义
      minQuantity: input.min_quantity ?? existing?.minQuantity ?? 1,
      rules:
        input.rules !== undefined
          ? (input.rules as PriceRulesWriteValue)
          : ((existing?.rules ?? {}) as PriceRulesWriteValue),
      validFrom:
        input.valid_from !== undefined
          ? toDateOrNull(input.valid_from)
          : (existing?.validFrom ?? null),
      validTo:
        input.valid_to !== undefined
          ? toDateOrNull(input.valid_to)
          : (existing?.validTo ?? null),
      priceListId:
        input.price_list_id !== undefined
          ? (input.price_list_id ?? null)
          : (existing?.priceListId ?? null),
      dealerTierId:
        input.dealer_tier_id !== undefined
          ? (input.dealer_tier_id ?? null)
          : (existing?.dealerTierId ?? null),
      dealerCompanyId:
        input.dealer_company_id !== undefined
          ? (input.dealer_company_id ?? null)
          : (existing?.dealerCompanyId ?? null),
    };
  }

  private mapPriceRecord(price: PriceRow): PricingRecord {
    // prices 表没有 updated_at 列，读取侧用 created_at 兜底。
    const createdAt = price.createdAt.toISOString();
    return {
      id: price.id,
      variant_id: price.variantId,
      price_list_id: price.priceListId,
      dealer_tier_id: price.dealerTierId,
      dealer_company_id: price.dealerCompanyId,
      market: price.market,
      currency: price.currency,
      price_type: price.priceType,
      amount_minor: price.amountMinor,
      min_quantity: price.minQuantity,
      rules: price.rules as PricingRecord["rules"],
      valid_from: toIso(price.validFrom),
      valid_to: toIso(price.validTo),
      created_at: createdAt,
      updated_at: createdAt,
    };
  }
}
