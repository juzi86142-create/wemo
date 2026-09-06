import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { PRICING_REPOSITORY, type PricingRepository } from "./pricing.repository";

@Injectable()
export class PricingPrismaRepository implements PricingRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async previewPricing(input: any): Promise<any> {
    const prices = await this.database.price.findMany({
      where: {
        variantId: { in: input.items.map((i: any) => i.variant_id) },
        market: input.market,
        currency: input.currency,
        dealerCompanyId: input.dealer_company_id ?? undefined,
      },
      orderBy: { amountMinor: "asc" },
    });

    const priceMap = new Map(prices.map(p => [p.variantId, p]));

    return {
      items: input.items.map((item: any) => {
        const price = priceMap.get(item.variant_id);
        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price_minor: price?.amountMinor ?? 0,
          line_total_minor: (price?.amountMinor ?? 0) * item.quantity,
          currency: price?.currency ?? input.currency,
          snapshot: {},
        };
      }),
      subtotal_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 0,
      currency: input.currency,
    };
  }

  async listPriceRecords(query: any): Promise<{ items: any[]; total: number; page: number; page_size: number }> {
    const [records, total] = await Promise.all([
      this.database.price.findMany({
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: { variant: true },
      }),
      this.database.price.count(),
    ]);

    return {
      items: records.map(r => this.mapPriceRecord(r)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createPriceRecord(input: any): Promise<any> {
    const price = await this.database.price.create({
      data: {
        variantId: input.variant_id,
        priceListId: input.price_list_id,
        dealerTierId: input.dealer_tier_id,
        dealerCompanyId: input.dealer_company_id,
        market: input.market,
        currency: input.currency,
        priceType: input.price_type,
        amountMinor: input.amount_minor,
        minQuantity: input.min_quantity ?? 1,
        rules: input.rules ?? {},
        validFrom: input.valid_from ? new Date(input.valid_from) : null,
        validTo: input.valid_to ? new Date(input.valid_to) : null,
      },
      include: { variant: true },
    });

    return this.mapPriceRecord(price);
  }

  async listPriceLists(): Promise<any[]> {
    const priceLists = await this.database.priceList.findMany({
      where: { status: "active" },
    });

    return priceLists.map(pl => ({
      id: pl.id,
      code: pl.code,
      name: pl.name,
      market: pl.market,
      currency: pl.currency,
    }));
  }

  private mapPriceRecord(price: any): any {
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
      rules: price.rules,
      valid_from: price.validFrom?.toISOString() || null,
      valid_to: price.validTo?.toISOString() || null,
      created_at: price.createdAt.toISOString(),
    };
  }
}
