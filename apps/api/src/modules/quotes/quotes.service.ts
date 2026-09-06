import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  QuoteConvertSchema,
  QuoteCreateSchema,
  QuoteListQuerySchema,
  QuoteListResponseSchema,
  QuoteMutationResponseSchema,
  QuoteVersionListResponseSchema,
  QuoteReviewSchema,
} from "@wemo/contracts/commerce";
import type { JsonValue } from "@wemo/contracts/common";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { QuotesPrismaRepository } from "./quotes.prisma-repository";
import { QUOTES_REPOSITORY } from "./quotes.repository";
import { OrdersPrismaRepository } from "../orders/orders.prisma-repository";
import { ORDERS_REPOSITORY } from "../orders/orders.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const QuoteIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class QuotesService {
  constructor(
    @Inject(QUOTES_REPOSITORY)
    private readonly repository: QuotesPrismaRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listQuotes(query: unknown) {
    const parsed = parseInput(QuoteListQuerySchema, query);
    const actor = this.requestContext.getActor();
    const scope =
      actor?.audience === "staff"
        ? parsed
        : actor?.audience === "dealer" && actor.company_id
          ? { ...parsed, company_id: actor.company_id }
          : parsed;
    return QuoteListResponseSchema.parse(this.repository.listQuotes(scope));
  }

  listVersions(id: unknown) {
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const item = this.repository.getQuoteById(parsedId.id);
    return QuoteVersionListResponseSchema.parse(
      [],
    );
  }

  createQuote(body: unknown) {
    const context = this.requestContext.requireContext();
    const existing = this.repository.getQuoteById(0);
    if (existing) {
      return QuoteMutationResponseSchema.parse({
        request_id: context.request_id,
        item: existing,
      });
    }
    const input = parseInput(QuoteCreateSchema, body);
    const actor = context.actor;
    const companyId =
      input.company_id ??
      actor?.company_id ??
      (actor?.audience === "staff" ? null : undefined);
    if (!companyId) {
      throw new ForbiddenException("报价需要企业上下文");
    }
    const payload = {
      items: input.items,
      pricing_snapshot: input.pricing_snapshot,
      terms_snapshot: input.terms_snapshot,
      valid_days: input.valid_days,
      note: input.note,
      company_id: companyId,
      requested_by_user_id:
        actor?.audience === "staff" ? null : actor?.user_id ?? null,
      request_id: context.request_id,
    };
    const item = this.repository.createQuote(payload);

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  reviewQuote(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("quotes:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const input = parseInput(QuoteReviewSchema, body);
    const before = this.repository.getQuoteById(parsedId.id);
    const payload: {
      decision: "under_review" | "quoted" | "rejected" | "expired";
      note?: string;
      terms_snapshot?: unknown;
    } = {
      decision: input.decision,
    };
    if (input.note !== undefined) payload.note = input.note;
    if (input.terms_snapshot !== undefined) payload.terms_snapshot = input.terms_snapshot;
    const item = this.repository.reviewQuote(
      parsedId.id,
      payload,
      actor.user_id,
      context.request_id,
    );

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  convertQuote(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const input = parseInput(QuoteConvertSchema, body);
    const before = this.repository.getQuoteById(parsedId.id);
    if (
      actor.audience !== "staff" &&
      before.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能转单其他企业报价");
    }
    if (before.status === "converted") {
      return QuoteMutationResponseSchema.parse({
        request_id: context.request_id,
        item: before,
      });
    }
    if (!["quoted", "accepted"].includes(before.status)) {
      throw new ConflictException("报价不能转单");
    }
    const order = this.ordersRepository.createOrder({
      channel: input.order_channel,
      user_id: actor.audience === "staff" ? null : actor.user_id,
      company_id: before.company_id,
      currency: "USD",
      subtotal_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 0,
      status: input.order_channel === "b2b" ? "pending_review" : "pending_payment",
      address_snapshot: {},
      pricing_snapshot: {
        quote_id: before.id,
        quote_no: before.quote_no,
        pricing_snapshot: before.pricing_snapshot,
        terms_snapshot: before.terms_snapshot,
        note: input.note ?? null,
      } as JsonValue,
      items: [],
      request_id: context.request_id,
      note: input.note ?? null,
    });
    const payload: {
      order_channel: "b2b" | "b2c";
      accepted_version?: number;
      note?: string;
      converted_order_id?: number | null;
    } = {
      order_channel: input.order_channel,
      converted_order_id: order.id,
    };
    if (input.accepted_version !== undefined) payload.accepted_version = input.accepted_version;
    if (input.note !== undefined) payload.note = input.note;
    const item = this.repository.convertToOrder(
      parsedId.id,
      context.request_id,
    );

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
