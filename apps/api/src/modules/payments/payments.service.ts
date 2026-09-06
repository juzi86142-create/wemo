import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PaymentCaptureSchema,
  PaymentCreateSchema,
  PaymentListQuerySchema,
  PaymentListResponseSchema,
  PaymentMutationResponseSchema,
  PaymentRefundSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CommerceStateStore } from "../../runtime/commerce.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PaymentIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(CommerceStateStore)
    private readonly stateStore: CommerceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listPayments(query: unknown) {
    this.authorization.requireStaffPermission("payments:read");
    const parsed = parseInput(PaymentListQuerySchema, query);
    return PaymentListResponseSchema.parse(this.stateStore.listPayments(parsed));
  }

  createPayment(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(PaymentCreateSchema, body);
    const order = this.stateStore.getOrderById(input.order_id);
    const actor = context.actor;
    if (
      actor &&
      actor.audience !== "staff" &&
      order.user_id !== actor.user_id &&
      order.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能为其他订单创建支付");
    }

    const payload =
      input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
        ? { ...(input.payload as Record<string, unknown>) }
        : {};

    const item = this.stateStore.createPayment({
      amount_minor: input.amount_minor ?? order.total_minor,
      idempotency_key: input.idempotency_key,
      order_id: input.order_id,
      provider: input.provider,
      request_id: context.request_id,
      payload: {
        ...payload,
        currency: order.currency,
        order_no: order.order_no,
      },
      provider_txn_id: null,
      status: "pending",
    });

    this.platformState.recordAudit({
      actor_id: actor?.user_id ?? 1,
      action: "payments.create",
      entity: "payment",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  capturePayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentCaptureSchema, body);
    const before = this.stateStore.getPaymentById(parsedId.id);
    const item = this.stateStore.capturePayment(parsedId.id, context.request_id, input);
    this.stateStore.transitionOrder(item.order_id, "paid", context.request_id, "payment captured");

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "payments.capture",
      entity: "payment",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  refundPayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentRefundSchema, body);
    const before = this.stateStore.getPaymentById(parsedId.id);
    const item = this.stateStore.refundPayment(
      parsedId.id,
      context.request_id,
      input as { amount_minor?: number | undefined; reason?: string | undefined },
    );
    if (item.status === "refunded") {
      try {
        this.stateStore.transitionOrder(item.order_id, "refunded", context.request_id, input.reason);
      } catch {
        // keep payment history even if order status no longer accepts refund transition
      }
    }

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "payments.refund",
      entity: "payment",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
