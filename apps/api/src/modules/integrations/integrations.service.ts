import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  IntegrationListResponseSchema,
  WebhookDeliveryListQuerySchema,
  WebhookDeliveryListResponseSchema,
  WebhookDeliveryMutationResponseSchema,
  WebhookIngestSchema,
} from "@wemo/contracts/platform";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { IntegrationsRedisRepository } from "./integrations.redis-repository";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository";
import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from "../orders/orders.repository";
import { parseInput } from "../../runtime/validation";
import { RequestContextStore } from "../../runtime/request-context.store";

const WebhookProviderParamSchema = z.object({
  provider: z.string().min(1),
});

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(INTEGRATIONS_REPOSITORY)
    private readonly repository: IntegrationsRedisRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listIntegrations() {
    this.authorization.requireStaffPermission("integrations:read");
    return IntegrationListResponseSchema.parse(
      await this.repository.listIntegrations({ page: 1, page_size: 20 }),
    );
  }

  async listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("integrations:read");
    const parsed = parseInput(WebhookDeliveryListQuerySchema, query);
    const page = await this.repository.listWebhookDeliveries({
      page: parsed.page,
      page_size: parsed.page_size,
      ...(parsed.provider !== undefined
        ? { provider: parsed.provider }
        : {}),
    });
    return WebhookDeliveryListResponseSchema.parse(page);
  }

  async ingestWebhook(provider: unknown, body: unknown, signature: string | null) {
    const parsedProvider = parseInput(WebhookProviderParamSchema, { provider });
    const payload = parseInput(WebhookIngestSchema, body);
    const context = this.requestContext.requireContext();
    const verified = this.isSignatureValid(parsedProvider.provider, signature);

    if (!verified) {
      throw new UnauthorizedException("Webhook 签名校验失败");
    }

    const now = new Date().toISOString();
    // 支付回调联动订单状态 需求 5.2 支付成功创建已支付订单
    let transitionError: string | null = null;
    if (
      parsedProvider.provider === "payment" &&
      payload.event === "payment.succeeded"
    ) {
      const orderId = (payload.payload as { order_id?: unknown })?.order_id;
      if (typeof orderId === "number" && Number.isInteger(orderId)) {
        try {
          await this.ordersRepository.transitionOrder(
            orderId,
            "paid",
            context.request_id,
            null,
            "webhook payment.succeeded",
          );
        } catch (error) {
          transitionError =
            error instanceof Error ? error.message : "订单状态联动失败";
        }
      }
    }

    const item = await this.repository.recordWebhookDelivery({
      integration_id: 1,
      provider: parsedProvider.provider,
      event: payload.event,
      status: "accepted",
      idempotency_key: payload.idempotency_key,
      request_id: context.request_id,
      attempt_count: 0,
      failure_reason: transitionError,
      payload: payload.payload,
      response: {
        accepted: true,
        provider: parsedProvider.provider,
        event: payload.event,
      },
      created_at: now,
      updated_at: now,
      completed_at: null,
    });

    return WebhookDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** HMAC 验签 密钥来自环境配置 WEMO_WEBHOOK_SECRET 需求 15.1 */
  private isSignatureValid(provider: string, signature: string | null): boolean {
    if (!signature) {
      return false;
    }
    const secret = process.env.WEMO_WEBHOOK_SECRET;
    if (!secret) {
      return false;
    }
    const expected = createHmac("sha256", secret)
      .update(provider)
      .digest("hex");
    const provided = signature.startsWith("sha256=")
      ? signature.slice("sha256=".length)
      : signature;
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex"),
    );
  }
}
