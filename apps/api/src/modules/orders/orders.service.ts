import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CheckoutCreateSchema,
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
import { NotificationsService } from "../notifications/notifications.service";
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
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listOrders(query: unknown) {
    const parsed = parseInput(OrderListQuerySchema, query);
    const actor = this.requestContext.getActor();
    let scope = parsed;
    if (actor) {
      if (actor.audience === "dealer") {
        // exactOptionalPropertyTypes：避免把 undefined 写进可选字段
        if (actor.company_id !== undefined) {
          scope = { ...scope, company_id: actor.company_id };
        }
      } else if (actor.audience !== "staff") {
        scope = { ...scope, user_id: actor.user_id };
      }
    }
    const list = await this.repository.listOrders(scope);
    return OrderListResponseSchema.parse(list);
  }

  async getOrder(id: unknown) {
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const actor = this.authorization.requireActor();
    const item = await this.repository.getOrderById(parsedId.id);
    if (!item) {
      throw new NotFoundException("订单不存在");
    }
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

  async checkout(body: unknown) {
    const input = parseInput(CheckoutCreateSchema, body);
    return this.createOrder({
      channel: "b2c",
      items: input.items,
      address_snapshot: {
        contact: input.contact,
        shipping_address: input.shipping_address,
        billing_address: input.billing_address ?? null,
        shipping_method: input.shipping_method ?? null,
        coupon_code: input.coupon_code ?? null,
        payment_method: input.payment_method ?? null,
      },
      note: input.note,
    });
  }

  async createOrder(body: unknown) {
    const context = this.requestContext.requireContext();
    const existing = await this.repository.findOrderByRequestId(context.request_id);
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
    const preview = await this.pricingRepository.previewPricing?.({
      items: input.items,
      market: context.market,
      currency: context.currency,
      ...(channel === "b2b" && companyId !== null ? { dealer_company_id: companyId } : {}),
    });
    const pricing =
      preview ?? {
        items: [],
        subtotal_minor: 0,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 0,
        currency: context.currency,
      };
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

    const item = await this.repository.createOrder({
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
      } as unknown as JsonValue,
      items: orderItems,
      request_id: context.request_id,
      note: input.note ?? null,
    });

    await this.notifications.emitBusinessNotification({
      template_code:
        channel === "b2b" ? "order_pending_review" : "order_confirmation",
      recipient_user_id: userId,
      company_id: companyId,
      audience: channel === "b2b" ? "dealer" : "user",
      channel: "email",
      request_id: context.request_id,
      payload: {
        order_id: item.id,
        order_no: item.order_no,
        status: item.status,
        total_minor: item.total_minor,
      },
    });

    return OrderMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateStatus(id: unknown, body: unknown) {
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const input = parseInput(OrderStatusUpdateSchema, body);
    const context = this.requestContext.requireContext();
    this.authorization.requireActor();
    const item = await this.repository.transitionOrder(
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
