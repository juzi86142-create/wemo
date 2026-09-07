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
import { CommerceRepository } from "../../runtime/commerce.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PaymentIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(CommerceRepository)
    private readonly stateStore: CommerceRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listPayments(query: unknown) {
    this.authorization.requireStaffPermission("payments:read");
    const parsed = parseInput(PaymentListQuerySchema, query);
    return PaymentListResponseSchema.parse(await this.stateStore.listPayments(parsed));
  }

  async createPayment(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(PaymentCreateSchema, body);
    const order = await this.stateStore.getOrderById(input.order_id);
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

    const item = await this.stateStore.createPayment({
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

    await this.platformState.recordAudit({
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

  async capturePayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentCaptureSchema, body);
    const before = await this.stateStore.getPaymentById(parsedId.id);
    const item = await this.stateStore.capturePayment(parsedId.id, context.request_id, input);
    await this.stateStore.transitionOrder(item.order_id, "paid", context.request_id, "payment captured");

    await this.platformState.recordAudit({
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

  async refundPayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentRefundSchema, body);
    const before = await this.stateStore.getPaymentById(parsedId.id);
    const item = await this.stateStore.refundPayment(
      parsedId.id,
      context.request_id,
      input as { amount_minor?: number; reason?: string },
    );
    if (item.status === "refunded") {
      try {
        await this.stateStore.transitionOrder(item.order_id, "refunded", context.request_id, input.reason);
      } catch {
        // keep payment history even if order status no longer accepts refund transition
      }
    }

    await this.platformState.recordAudit({
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

