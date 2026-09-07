import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CheckoutCreateSchema,
  OrderCreateSchema,
  OrderListQuerySchema,
  OrderListResponseSchema,
  OrderMutationResponseSchema,
  OrderStatusSchema,
  ShipmentCreateSchema,
  ShipmentListResponseSchema,
  ShipmentMutationResponseSchema,
} from "@wemo/contracts/commerce";
import type { JsonValue } from "@wemo/contracts/common";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { listResponse } from "../../runtime/list-response";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersPrismaRepository } from "./orders.prisma-repository";
import { ORDERS_REPOSITORY } from "./orders.repository";
import { PricingPrismaRepository } from "../pricing/pricing.prisma-repository";
import { PRICING_REPOSITORY } from "../pricing/pricing.repository";
import {
  COUPON_REPOSITORY,
  type CouponRepository,
} from "../pricing/coupon.redis-repository";
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
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listOrders(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(OrderListQuerySchema, query);
    let scope = parsed;
    if (actor.audience === "dealer") {
      // exactOptionalPropertyTypes：避免把 undefined 写进可选字段
      if (actor.company_id !== undefined) {
        scope = { ...scope, company_id: actor.company_id };
      }
    } else if (actor.audience !== "staff") {
      scope = { ...scope, user_id: actor.user_id };
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
        payment_method: input.payment_method ?? null,
      },
      ...(input.coupon_code !== undefined
        ? { coupon_code: input.coupon_code }
        : {}),
      note: input.note,
    });
  }

  /** 折扣码校验 未提供时零折扣 无效即拒绝 */
  private async resolveCouponDiscount(
    couponCode: string | undefined,
    subtotalMinor: number,
    market: string,
    userId: number | null,
    identityByVariant: Map<
      number,
      { sku: string; name: string; product_id: number }
    >,
  ): Promise<{
    discount_minor: number;
    coupon_code: string | null;
    coupon_id: number | null;
  }> {
    if (couponCode === undefined) {
      return { discount_minor: 0, coupon_code: null, coupon_id: null };
    }
    const coupon = await this.couponRepository.getCouponByCode(couponCode);
    if (!coupon) {
      throw new NotFoundException("折扣码不存在");
    }
    if (!coupon.active) {
      throw new ForbiddenException("折扣码已停用");
    }
    const now = new Date();
    if (coupon.valid_from !== null && new Date(coupon.valid_from) > now) {
      throw new ForbiddenException("折扣码尚未生效");
    }
    if (coupon.valid_to !== null && new Date(coupon.valid_to) < now) {
      throw new ForbiddenException("折扣码已过期");
    }
    if (coupon.market !== null && coupon.market !== market) {
      throw new ForbiddenException("折扣码不适用于当前市场");
    }
    if (coupon.min_amount_minor !== null && subtotalMinor < coupon.min_amount_minor) {
      throw new ForbiddenException("订单金额未达到折扣码门槛");
    }
    if (coupon.product_ids.length > 0) {
      const inScope = [...identityByVariant.values()].some((identity) =>
        coupon.product_ids.includes(identity.product_id),
      );
      if (!inScope) {
        throw new ForbiddenException("折扣码不适用于订单中的商品");
      }
    }
    if (coupon.user_ids.length > 0 && !coupon.user_ids.includes(userId ?? -1)) {
      throw new ForbiddenException("折扣码不适用于当前用户");
    }
    if (
      coupon.usage_limit !== null &&
      coupon.usage_count >= coupon.usage_limit
    ) {
      throw new ForbiddenException("折扣码使用次数已达上限");
    }

    const discountMinor =
      coupon.kind === "percent"
        ? Math.floor((subtotalMinor * coupon.value_minor) / 10_000)
        : coupon.kind === "fixed"
          ? Math.min(coupon.value_minor, subtotalMinor)
          : 0;

    return {
      discount_minor: discountMinor,
      coupon_code: coupon.code,
      coupon_id: coupon.id,
    };
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
    const preview = await this.pricingRepository.previewPricing({
      items: input.items,
      market: context.market,
      currency: context.currency,
      ...(channel === "b2b" && companyId !== null ? { dealer_company_id: companyId } : {}),
    });
    const pricing = preview;
    // 变体真实标识与库存 缺价不静默成交 库存不足在提交节点拦截（需求 5.2）
    const variantIds = input.items.map((item) => item.variant_id);
    const [identityByVariant, stockByVariant] = await Promise.all([
      this.repository.getVariantIdentity(variantIds),
      this.repository.getAvailableStock(variantIds, context.market),
    ]);
    const orderItems = input.items.map((inputItem, index) => {
      const identity = identityByVariant.get(inputItem.variant_id);
      if (!identity) {
        throw new NotFoundException(`变体 ${inputItem.variant_id} 不存在`);
      }
      const available = stockByVariant.get(inputItem.variant_id) ?? 0;
      if (inputItem.quantity > available) {
        throw new ForbiddenException(
          `变体 ${inputItem.variant_id} 库存不足 可订 ${available}`,
        );
      }
      const previewItem = pricing.items.find(
        (item) => item.variant_id === inputItem.variant_id,
      );
      if (!previewItem) {
        throw new NotFoundException(`变体 ${inputItem.variant_id} 不可售`);
      }
      return {
        id: index + 1,
        variant_id: inputItem.variant_id,
        sku_snapshot: identity.sku,
        name_snapshot: identity.name,
        quantity: inputItem.quantity,
        unit_price_minor: previewItem.unit_price_minor,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: previewItem.line_total_minor,
        detail_snapshot: {
          preview: previewItem,
          request_id: context.request_id,
        } as unknown as JsonValue,
      };
    });

    const subtotal_minor = orderItems.reduce((sum, item) => sum + item.total_minor, 0);

    // 折扣码校验与计算 需求 ADM-PR-004/5.2 仅结算时核销
    const discount = await this.resolveCouponDiscount(
      input.coupon_code,
      subtotal_minor,
      context.market,
      userId,
      identityByVariant,
    );

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
      total_minor: subtotal_minor - discount.discount_minor,
      status,
      address_snapshot: input.address_snapshot,
      pricing_snapshot: {
        ...pricing,
        discount_minor: discount.discount_minor,
        coupon_code: discount.coupon_code,
        coupon_id: discount.coupon_id,
        po_number: input.po_number ?? null,
        payment_method: input.payment_method ?? null,
        cart_id: input.cart_id ?? null,
        quote_id: input.quote_id ?? null,
        note: input.note ?? null,
      } as unknown as JsonValue,
      items: orderItems,
      request_id: context.request_id,
      note: input.note ?? null,
    });

    if (discount.coupon_id !== null) {
      await this.couponRepository.recordUsage(discount.coupon_id);
    }

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
    const actor = this.authorization.requireAudience("staff");
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const input = parseInput(OrderStatusUpdateSchema, body);
    const context = this.requestContext.requireContext();
    const order = await this.repository.getOrderById(parsedId.id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    this.assertStatusTransition(order.channel, order.status, input.status);
    const item = await this.repository.transitionOrder(
      parsedId.id,
      input.status,
      context.request_id,
      actor.user_id,
      input.note,
    );

    return OrderMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** 历史复购 重新校验当前价格库存与停售 需求 ORD-B2B-007 */
  async reorderOrder(id: unknown) {
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const order = await this.repository.getOrderById(parsedId.id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    if (
      actor.audience !== "staff" &&
      order.user_id !== actor.user_id &&
      order.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能复购其他订单");
    }
    const items = await this.repository.getOrderItems(parsedId.id);

    return this.createOrder({
      channel: order.channel,
      items: items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
      address_snapshot: order.address_snapshot,
      note: `复购自订单 ${order.order_no}`,
    });
  }

  /** 分批发货 需求 ORD-B2B-005/ADM-O-005 仅员工可创建 */
  async listShipments(id: unknown) {
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const order = await this.repository.getOrderById(parsedId.id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    if (
      actor.audience !== "staff" &&
      order.user_id !== actor.user_id &&
      order.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能查看其他订单的发货记录");
    }
    return ShipmentListResponseSchema.parse(
      listResponse(await this.repository.listShipments(parsedId.id)),
    );
  }

  async createShipment(id: unknown, body: unknown) {
    const actor = this.authorization.requireAudience("staff");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const input = parseInput(ShipmentCreateSchema, body);
    const result = await this.repository.createShipment(
      parsedId.id,
      input,
      actor.user_id,
      context.request_id,
    );

    return ShipmentMutationResponseSchema.parse({
      request_id: context.request_id,
      item: result.shipment,
    });
  }

  /** 订单状态机 需求 8.3 B2C 与 8.4 B2B 仅允许合法迁移 */
  private assertStatusTransition(
    channel: string,
    from: string,
    to: string,
  ): void {
    const transitions: Record<string, Record<string, string[]>> = {
      // B2C：Pending Payment → Paid → Processing → Partially Shipped → Shipped → Completed，异常 Cancelled
      b2c: {
        pending_payment: ["paid", "cancelled"],
        paid: ["processing", "cancelled", "refunded"],
        processing: ["partially_shipped", "cancelled"],
        partially_shipped: ["shipped"],
        shipped: ["completed"],
        completed: [],
        cancelled: [],
        refunded: [],
      },
      // B2B：Pending Review → Confirmed → Awaiting Payment → Processing → … → Completed，异常 Cancelled
      b2b: {
        pending_review: ["confirmed", "cancelled"],
        confirmed: ["awaiting_payment", "cancelled"],
        awaiting_payment: ["processing", "cancelled"],
        processing: ["partially_shipped", "cancelled"],
        partially_shipped: ["shipped"],
        shipped: ["completed"],
        completed: [],
        cancelled: [],
      },
    };
    const allowed = transitions[channel]?.[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ForbiddenException(
        `订单状态不允许从 ${from} 变更为 ${to}`,
      );
    }
  }
}
