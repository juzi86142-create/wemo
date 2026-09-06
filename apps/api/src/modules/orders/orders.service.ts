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
import { CommerceStateStore } from "../../runtime/commerce.state";
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
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
    @Inject(CommerceStateStore)
    private readonly stateStore: CommerceStateStore,
    @Inject(ExperienceStateStore)
    private readonly experience: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
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
    return OrderListResponseSchema.parse(this.stateStore.listOrders(scope));
  }

  getOrder(id: unknown) {
    const parsedId = parseInput(OrderIdParamSchema, { id });
    const item = this.stateStore.getOrderById(parsedId.id);
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
    const existing = this.stateStore.findOrderByRequestId(context.request_id);
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
    const pricing = this.stateStore.previewPricing({
      items: input.items,
      market: context.market,
      currency: context.currency,
      dealer_company_id: channel === "b2b" ? companyId ?? undefined : undefined,
    });
    const orderItems = pricing.items.map((item, index) => ({
      id: index + 1,
      variant_id: item.variant_id,
      sku_snapshot: String((item.snapshot as any).variant?.sku ?? item.variant_id),
      name_snapshot: String((item.snapshot as any).variant?.product_name ?? item.variant_id),
      quantity: item.quantity,
      unit_price_minor: item.unit_price_minor,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: item.line_total_minor,
      detail_snapshot: {
        preview: item,
        request_id: context.request_id,
      } as JsonValue,
    }));

    const subtotal_minor = orderItems.reduce((sum, item) => sum + item.total_minor, 0);
    const status =
      channel === "b2b" ? "pending_review" : "pending_payment";

    const item = this.stateStore.createOrder({
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

    const reserved: number[] = [];
    try {
      for (const line of orderItems) {
        const reservation = this.stateStore.reserveInventory(
          {
            variant_id: line.variant_id!,
            quantity: line.quantity,
            owner_type: "order",
            owner_id: item.id,
            idempotency_key: `${item.id}:${line.variant_id}`,
            market: context.market,
            expires_at: null,
          },
          context.request_id,
        );
        reserved.push(reservation.id);
      }
    } catch (error) {
      for (const reservationId of reserved) {
        try {
          this.stateStore.releaseInventory(
            reservationId,
            context.request_id,
            "order reservation failed",
          );
        } catch {
          // best effort rollback
        }
      }
      this.stateStore.transitionOrder(
        item.id,
        "cancelled",
        context.request_id,
        "库存预占失败",
      );
      throw error;
    }

    this.platformState.recordAudit({
      actor_id: actor?.user_id ?? 1,
      action: "orders.create",
      entity: "order",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
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
    const before = this.stateStore.getOrderById(parsedId.id);
    if (
      actor.audience !== "staff" &&
      before.company_id !== actor.company_id &&
      before.user_id !== actor.user_id
    ) {
      throw new ForbiddenException("不能修改其他订单");
    }

    const item = this.stateStore.transitionOrder(
      parsedId.id,
      input.status,
      context.request_id,
      input.note,
    );

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "orders.status.update",
      entity: "order",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return OrderMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
