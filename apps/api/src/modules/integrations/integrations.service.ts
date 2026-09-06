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
import { IntegrationsPrismaRepository } from "./integrations.prisma-repository";
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
    private readonly repository: IntegrationsPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listIntegrations() {
    this.authorization.requireStaffPermission("integrations:read");
    return IntegrationListResponseSchema.parse(this.repository.listIntegrations({ page: 1, page_size: 20 }));
  }

  listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("integrations:read");
    const parsed = parseInput(WebhookDeliveryListQuerySchema, query);
    return WebhookDeliveryListResponseSchema.parse(
      [],
    );
  }

  ingestWebhook(provider: unknown, body: unknown, signature: string | null) {
    const parsedProvider = parseInput(WebhookProviderParamSchema, { provider });
    const payload = parseInput(WebhookIngestSchema, body);
    const context = this.requestContext.requireContext();
    const verified = this.isSignatureValid(parsedProvider.provider, signature);

    if (!verified) {
      throw new UnauthorizedException("Webhook 签名校验失败");
    }

    return WebhookDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item: {
        id: 1,
        provider: parsedProvider.provider,
        request_id: context.request_id,
        actor_id: null,
        signature,
        signature_version: payload.signature_version,
        ingest: payload,
        verified,
        response: {
          accepted: true,
          provider: parsedProvider.provider,
          event: payload.event,
        },
        created_at: new Date().toISOString(),
      },
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
