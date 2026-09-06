import type { Quote, QuoteCreateInput, QuoteListQuery, QuoteVersion } from "@wemo/contracts";

export const QUOTES_REPOSITORY = Symbol("QUOTES_REPOSITORY");

/** createQuote 的仓储入参：契约字段 + 服务层推导的上下文字段。 */
export interface QuoteCreateRecord extends QuoteCreateInput {
  company_id: number;
  requested_by_user_id: number | null;
  /** quote_versions.created_by（版本作者，始终为用户 ID）。 */
  created_by: number;
  request_id: string;
}

/** reviewQuote 的仓储入参（decision 为 QuoteReviewSchema 的四档子集）。 */
export interface QuoteReviewRecord {
  decision: "under_review" | "quoted" | "rejected" | "expired";
  note?: string;
  terms_snapshot?: unknown;
}

/** convertToOrder 的仓储入参。 */
export interface QuoteConvertRecord {
  channel: "b2b" | "b2c";
  note?: string;
}

export interface QuotesRepository {
  listQuotes(query: QuoteListQuery): Promise<{ items: Quote[]; total: number; page: number; page_size: number }>;
  getQuoteById(id: number): Promise<Quote | null>;
  listVersions(quoteId: number): Promise<QuoteVersion[]>;
  createQuote(input: QuoteCreateRecord): Promise<Quote>;
  reviewQuote(id: number, input: QuoteReviewRecord, reviewerId: number, requestId: string): Promise<Quote>;
  convertToOrder(quoteId: number, input: QuoteConvertRecord, actorId: number, requestId: string): Promise<Quote>;
}
