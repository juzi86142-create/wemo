import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  IntegrationListResponseSchema,
  IntegrationMutationResponseSchema,
  WebhookDeliveryListQuerySchema,
  WebhookDeliveryListResponseSchema,
  WebhookDeliveryMutationResponseSchema,
  WebhookIngestSchema,
} from "@wemo/contracts/platform";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

const WebhookProviderParamSchema = z.object({
  provider: z.string().min(1),
});

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listIntegrations() {
    this.authorization.requireStaffPermission("integrations:read");
    return IntegrationListResponseSchema.parse(this.stateStore.listIntegrations());
  }

  listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("integrations:read");
    const parsed = parseInput(WebhookDeliveryListQuerySchema, query);
    return WebhookDeliveryListResponseSchema.parse(
      this.stateStore.listDeliveries(parsed),
    );
  }

  ingestWebhook(provider: unknown, body: unknown, signature: string | null) {
    const parsedProvider = parseInput(WebhookProviderParamSchema, { provider });
    const payload = parseInput(WebhookIngestSchema, body);
    const context = this.requestContext.requireContext();
    const verified = this.isSignatureValid(parsedProvider.provider, signature);

    const item = this.stateStore.recordWebhookDelivery({
      provider: parsedProvider.provider,
      request_id: context.request_id,
      actor_id: context.actor?.user_id ?? null,
      signature,
      signature_version: payload.signature_version,
      ingest: payload,
      verified,
      response: verified
        ? {
            accepted: true,
            provider: parsedProvider.provider,
            event: payload.event,
          }
        : null,
    });

    if (!verified) {
      throw new UnauthorizedException("Webhook 签名校验失败");
    }

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
