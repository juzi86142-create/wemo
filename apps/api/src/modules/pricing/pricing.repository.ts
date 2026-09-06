import type {
  PricingPreviewRequest,
  PricingRecord,
  PricingRecordListQuery,
} from "@wemo/contracts";

export const PRICING_REPOSITORY = Symbol("PRICING_REPOSITORY");

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/** PricingPreviewResponseSchema 中 item 的展开形状（contracts 未导出独立类型）。 */
export interface PricePreviewItem {
  variant_id: number;
  quantity: number;
  currency: string;
  price_type: string;
  price_record_id: number;
  dealer_company_id: number | null;
  dealer_tier_id: number | null;
  price_list_id: number | null;
  unit_price_minor: number;
  line_total_minor: number;
  min_quantity: number;
  valid_from: string | null;
  valid_to: string | null;
  snapshot: Record<string, unknown>;
}

export interface PricePreview {
  currency: string;
  subtotal_minor: number;
  source: string;
  items: PricePreviewItem[];
}

/**
 * PricingRecordUpsertSchema 的入库形状（create 与按 id update 共用）。
 * 可选项声明为 `| undefined`，以兼容 exactOptionalPropertyTypes 下的展开式传参。
 */
export interface PriceRecordCreateInput {
  id?: number;
  variant_id: number;
  market: string;
  currency: string;
  price_type: string;
  amount_minor: number;
  min_quantity?: number | undefined;
  rules?: unknown;
  valid_from?: string | null;
  valid_to?: string | null;
  price_list_id?: number | null;
  dealer_tier_id?: number | null;
  dealer_company_id?: number | null;
}

export interface PriceListSummary {
  id: number;
  code: string;
  name: string;
  market: string;
  currency: string;
}

export interface PricingRepository {
  previewPricing(input: PricingPreviewRequest): Promise<PricePreview>;
  listPriceRecords(
    query: PricingRecordListQuery,
  ): Promise<Page<PricingRecord>>;
  createPriceRecord(input: PriceRecordCreateInput): Promise<PricingRecord>;
  listPriceLists(): Promise<PriceListSummary[]>;
}
