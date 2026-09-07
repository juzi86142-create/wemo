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
import { PaymentsPrismaRepository } from "./payments.prisma-repository";
import { PAYMENTS_REPOSITORY } from "./payments.repository";
import { ORDERS_REPOSITORY } from "../orders/orders.repository";
import type { OrdersRepository } from "../orders/orders.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PaymentIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsPrismaRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listPayments(query: unknown) {
    this.authorization.requireStaffPermission("payments:read");
    const parsed = parseInput(PaymentListQuerySchema, query);
    return PaymentListResponseSchema.parse(
      await this.paymentsRepository.listPayments(parsed),
    );
  }

  async createPayment(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(PaymentCreateSchema, body);
    const order = await this.ordersRepository.getOrderById(input.order_id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }
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

    const item = await this.paymentsRepository.createPayment({
      amount_minor: input.amount_minor ?? order.total_minor,
      idempotency_key: input.idempotency_key,
      order_id: input.order_id,
      provider: input.provider,
      currency: order.currency,
      request_id: context.request_id,
      payload: {
        ...payload,
        currency: order.currency,
        order_no: order.order_no,
      },
      provider_txn_id: null,
      status: "pending",
    });

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async capturePayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentCaptureSchema, body);
    const item = await this.paymentsRepository.capturePayment(
      parsedId.id,
      context.request_id,
      input,
    );
    await this.ordersRepository.transitionOrder(
      item.order_id,
      "paid",
      context.request_id,
      context.actor?.user_id ?? null,
      "payment captured",
    );

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async refundPayment(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    this.authorization.requireActor();
    const parsedId = parseInput(PaymentIdParamSchema, { id });
    const input = parseInput(PaymentRefundSchema, body);
    const item = await this.paymentsRepository.refundPayment(parsedId.id, input, context.request_id);
    if (item.status === "refunded") {
      try {
        await this.ordersRepository.transitionOrder(
          item.order_id,
          "refunded",
          context.request_id,
          context.actor?.user_id ?? null,
          input.reason,
        );
      } catch {
        // keep payment history even if order status no longer accepts refund transition
      }
    }

    return PaymentMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
