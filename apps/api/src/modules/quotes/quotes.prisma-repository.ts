import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { QUOTES_REPOSITORY, type QuotesRepository } from "./quotes.repository";
import type { Quote } from "@wemo/contracts";

@Injectable()
export class QuotesPrismaRepository implements QuotesRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createQuote(input: any): Promise<Quote> {
    const quoteNo = `QUO-${Date.now()}`;
    const quote = await this.database.quote.create({
      data: {
        quoteNo,
        customerId: input.customer_id,
        dealerCompanyId: input.dealer_company_id,
        status: "draft",
        items: input.items || [],
        currency: input.currency,
        subtotalMinor: input.subtotal_minor,
        taxMinor: input.tax_minor,
        shippingMinor: input.shipping_minor,
        totalMinor: input.total_minor,
        validUntil: input.valid_until ? new Date(input.valid_until) : null,
        notes: input.notes,
      },
    });

    return this.mapQuote(quote);
  }

  async getQuoteById(id: number): Promise<Quote | null> {
    const quote = await this.database.quote.findUnique({
      where: { id },
    });

    return quote ? this.mapQuote(quote) : null;
  }

  async listQuotes(query: any): Promise<{ items: Quote[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.customer_id) where.customerId = query.customer_id;
    if (query.dealer_company_id) where.dealerCompanyId = query.dealer_company_id;
    if (query.status) where.status = query.status;

    const [quotes, total] = await Promise.all([
      this.database.quote.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.quote.count({ where }),
    ]);

    return {
      items: quotes.map(q => this.mapQuote(q)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async updateQuote(id: number, input: any): Promise<Quote> {
    const quote = await this.database.quote.update({
      where: { id },
      data: {
        items: input.items,
        currency: input.currency,
        subtotalMinor: input.subtotal_minor,
        taxMinor: input.tax_minor,
        shippingMinor: input.shipping_minor,
        totalMinor: input.total_minor,
        validUntil: input.valid_until ? new Date(input.valid_until) : undefined,
        notes: input.notes,
      },
    });

    return this.mapQuote(quote);
  }

  async submitQuote(id: number, requestId: string): Promise<Quote> {
    const quote = await this.database.quote.update({
      where: { id },
      data: { status: "submitted" },
    });

    return this.mapQuote(quote);
  }

  async reviewQuote(id: number, input: any, reviewerId: number, requestId: string): Promise<Quote> {
    const quote = await this.database.quote.update({
      where: { id },
      data: {
        status: input.decision === "approved" ? "approved" : "rejected",
        reviewNotes: input.notes,
      },
    });

    return this.mapQuote(quote);
  }

  async convertToOrder(quoteId: number, requestId: string): Promise<{ order_id: number }> {
    const quote = await this.database.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    const order = await this.database.order.create({
      data: {
        orderNo: `ORD-${Date.now()}`,
        customerId: quote.customerId,
        dealerCompanyId: quote.dealerCompanyId,
        market: "US",
        locale: "en",
        status: "pending",
        currency: quote.currency,
        subtotalMinor: quote.subtotalMinor,
        taxMinor: quote.taxMinor,
        shippingMinor: quote.shippingMinor,
        totalMinor: quote.totalMinor,
        items: {
          create: quote.items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            totalMinor: item.totalMinor,
          })),
        },
      },
    });

    await this.database.quote.update({
      where: { id: quoteId },
      data: { status: "converted" },
    });

    return { order_id: order.id };
  }

  private mapQuote(quote: any): Quote {
    return {
      id: quote.id,
      quote_no: quote.quoteNo,
      customer_id: quote.customerId,
      dealer_company_id: quote.dealerCompanyId,
      status: quote.status,
      items: quote.items || [],
      currency: quote.currency,
      subtotal_minor: quote.subtotalMinor,
      tax_minor: quote.taxMinor,
      shipping_minor: quote.shippingMinor,
      total_minor: quote.totalMinor,
      valid_until: quote.validUntil?.toISOString() || null,
      notes: quote.notes,
      review_notes: quote.reviewNotes,
      created_at: quote.createdAt.toISOString(),
      updated_at: quote.updatedAt.toISOString(),
    };
  }
}
