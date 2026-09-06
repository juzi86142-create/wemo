import type { PriceList, PriceRecord, PriceRecordListQuery, PricingPreviewRequest, PricingPreviewResponse, PricingRecordCreateInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const PRICING_REPOSITORY = Symbol("PRICING_REPOSITORY");

export interface PricingRepository {
  previewPricing(input: PricingPreviewRequest): Promise<PricingPreviewResponse>;
  listPriceRecords(query: PriceRecordListQuery): Promise<{ items: PriceRecord[]; total: number; page: number; page_size: number }>;
  createPriceRecord(input: PricingRecordCreateInput): Promise<PriceRecord>;
  listPriceLists(): Promise<PriceList[]>;
}
