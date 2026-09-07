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
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsService } from "../notifications/notifications.service";
import { QuotesPrismaRepository } from "./quotes.prisma-repository";
import { QUOTES_REPOSITORY } from "./quotes.repository";
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
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listQuotes(query: unknown) {
    const parsed = parseInput(QuoteListQuerySchema, query);
    const actor = this.requestContext.getActor();
    const scope =
      actor?.audience === "staff"
        ? parsed
        : actor?.audience === "dealer" && actor.company_id
          ? { ...parsed, company_id: actor.company_id }
          : parsed;
    return QuoteListResponseSchema.parse(
      await this.repository.listQuotes(scope),
    );
  }

  async listVersions(id: unknown) {
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const quote = await this.repository.getQuoteById(parsedId.id);
    if (!quote) {
      throw new ConflictException("报价不存在");
    }
    return QuoteVersionListResponseSchema.parse(quote.versions);
  }

  async createQuote(body: unknown) {
    const context = this.requestContext.requireContext();
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
      created_by: actor?.user_id ?? 1,
      request_id: context.request_id,
    };
    const item = await this.repository.createQuote(payload);

    await this.notifications.emitBusinessNotification({
      template_code: "quote_requested",
      recipient_user_id: payload.requested_by_user_id,
      company_id: companyId,
      audience: "dealer",
      channel: "email",
      request_id: context.request_id,
      payload: { quote_id: item.id, status: item.status },
    });

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async reviewQuote(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("quotes:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const input = parseInput(QuoteReviewSchema, body);
    const payload: {
      decision: "under_review" | "quoted" | "rejected" | "expired";
      note?: string;
      terms_snapshot?: unknown;
    } = {
      decision: input.decision,
    };
    if (input.note !== undefined) payload.note = input.note;
    if (input.terms_snapshot !== undefined) payload.terms_snapshot = input.terms_snapshot;
    const item = await this.repository.reviewQuote(
      parsedId.id,
      payload,
      actor.user_id,
      context.request_id,
    );

    await this.notifications.emitBusinessNotification({
      template_code: "quote_reviewed",
      recipient_user_id: item.requested_by_user_id,
      company_id: item.company_id,
      audience: "dealer",
      channel: "email",
      request_id: context.request_id,
      payload: {
        quote_id: item.id,
        status: item.status,
        decision: payload.decision,
      },
    });

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async convertQuote(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(QuoteIdParamSchema, { id });
    const input = parseInput(QuoteConvertSchema, body);
    const before = await this.repository.getQuoteById(parsedId.id);
    if (!before) {
      throw new ConflictException("报价不存在");
    }
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
    const item = await this.repository.convertToOrder(
      parsedId.id,
      {
        channel: input.order_channel,
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      actor.user_id,
      context.request_id,
    );

    return QuoteMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
