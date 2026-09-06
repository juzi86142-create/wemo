import type { Quote, QuoteCreateInput, QuoteListQuery, QuoteReviewInput, QuoteUpdateInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const QUOTES_REPOSITORY = Symbol("QUOTES_REPOSITORY");

export interface QuotesRepository {
  createQuote(input: QuoteCreateInput): Promise<Quote>;
  getQuoteById(id: number): Promise<Quote | null>;
  listQuotes(query: QuoteListQuery): Promise<{ items: Quote[]; total: number; page: number; page_size: number }>;
  updateQuote(id: number, input: QuoteUpdateInput): Promise<Quote>;
  submitQuote(id: number, requestId: string): Promise<Quote>;
  reviewQuote(id: number, input: QuoteReviewInput, reviewerId: number, requestId: string): Promise<Quote>;
  convertToOrder(quoteId: number, requestId: string): Promise<{ order_id: number }>;
}
