import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  IntegrationListResponseSchema,
  WebhookDeliveryListQuerySchema,
  WebhookDeliveryListResponseSchema,
  WebhookDeliveryMutationResponseSchema,
  WebhookIngestSchema,
} from "@wemo/contracts/platform";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { IntegrationsRedisRepository } from "./integrations.redis-repository";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository";
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
    const item = await this.repository.recordWebhookDelivery({
      integration_id: 1,
      provider: parsedProvider.provider,
      event: payload.event,
      status: "accepted",
      idempotency_key: payload.idempotency_key,
      request_id: context.request_id,
      attempt_count: 0,
      failure_reason: null,
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

  private isSignatureValid(provider: string, signature: string | null): boolean {
    if (!signature) {
      return false;
    }

    const expected = `demo:${provider}`;
    const trusted = `trusted:${provider}`;
    return signature === expected || signature === trusted;
  }
}
