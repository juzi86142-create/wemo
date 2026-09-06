import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  CommerceChannelSchema,
  OrderCreateSchema,
  OrderListQuerySchema,
  OrderListResponseSchema,
  OrderMutationResponseSchema,
  OrderStatusSchema,
} from "@wemo/contracts/commerce";
import type { JsonValue } from "@wemo/contracts/common";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { OrdersPrismaRepository } from "./orders.prisma-repository";
import { ORDERS_REPOSITORY } from "./orders.repository";
import { PricingPrismaRepository } from "../pricing/pricing.prisma-repository";
import { PRICING_REPOSITORY } from "../pricing/pricing.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const OrderIdParamSchema = z.object({
  id: EntityIdSchema,
});

const OrderStatusUpdateSchema = z.object({
  status: OrderStatusSchema,
  note: z.string().min(1).optional(),
});

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly repository: OrdersPrismaRepository,
    @Inject(PRICING_REPOSITORY)
    private readonly pricingRepository: PricingPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listOrders(query: unknown) {
    const parsed = parseInput(OrderListQuerySchema, query);
    const actor = this.requestContext.getActor();
    const scope =
      actor?.audience === "staff"
        ? parsed
        : actor?.audience === "dealer"
          ? { ...parsed, company_id: actor.company_id ?? undefined }
          : actor
            ? { ...parsed, user_id: actor.user_id }
            : parsed;
    return OrderListResponseSchema.parse(this.repository.listOrders(scope));
  }

  getOrder(id: unknown) {
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const item = this.repository.getOrderById(parsedId.id);
    const actor = this.authorization.requireActor();
    if (
      actor.audience !== "staff" &&
      item.user_id !== actor.user_id &&
      item.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能查看其他订单");
    }
    return OrderMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  createOrder(body: unknown) {
    const context = this.requestContext.requireContext();
    const existing = this.repository.findOrderByRequestId(context.request_id);
    if (existing) {
      return OrderMutationResponseSchema.parse({
        request_id: context.request_id,
        item: existing,
      });
    }
    const input = parseInput(OrderCreateSchema, body);
    const actor = context.actor;
    const channel = input.channel;
    if (channel === "b2b" && !actor?.company_id && actor?.audience !== "staff") {
      throw new ForbiddenException("B2B 订单需要企业上下文");
    }

    const companyId =
      channel === "b2b"
        ? actor?.company_id ?? this.authorization.requireCompanyId()
        : actor?.company_id ?? null;
    const userId =
      actor?.audience === "staff" ? null : actor?.user_id ?? null;
    const pricing = this.pricingRepository.previewPricing?.({
      items: input.items,
      market: context.market,
      currency: context.currency,
      dealer_company_id: channel === "b2b" ? companyId ?? undefined : undefined,
    }) ?? { items: [], subtotal_minor: 0, tax_minor: 0, shipping_minor: 0, total_minor: 0, currency: context.currency };
    const orderItems = pricing.items?.map((item: any, index: number) => ({
      id: index + 1,
      variant_id: item.variant_id,
      sku_snapshot: String((item.snapshot as any)?.variant?.sku ?? item.variant_id),
      name_snapshot: String((item.snapshot as any)?.variant?.product_name ?? item.variant_id),
      quantity: item.quantity,
      unit_price_minor: item.unit_price_minor,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: item.line_total_minor,
      detail_snapshot: {
        preview: item,
        request_id: context.request_id,
      } as JsonValue,
    })) || [];

    const subtotal_minor = orderItems.reduce((sum, item) => sum + item.total_minor, 0);
    const status =
      channel === "b2b" ? "pending_review" : "pending_payment";

    const item = this.repository.createOrder({
      channel,
      user_id: userId,
      company_id: companyId,
      currency: pricing.currency,
      subtotal_minor,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: subtotal_minor,
      status,
      address_snapshot: input.address_snapshot,
      pricing_snapshot: {
        ...pricing,
        cart_id: input.cart_id ?? null,
        quote_id: input.quote_id ?? null,
        note: input.note ?? null,
      } as JsonValue,
      items: orderItems,
      request_id: context.request_id,
      note: input.note ?? null,
    });

    return OrderMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateStatus(id: unknown, body: unknown) {
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const input = parseInput(OrderStatusUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const item = this.repository.transitionOrder(
      parsedId.id,
      input.status,
      context.request_id,
      input.note,
    );

    return OrderMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
