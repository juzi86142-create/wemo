import { Inject, Injectable } from "@nestjs/common";
import {
  PricingPreviewRequestSchema,
  PricingPreviewResponseSchema,
  PricingRecordListQuerySchema,
  PricingRecordListResponseSchema,
  PricingRecordMutationResponseSchema,
  PricingRecordUpsertSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CommerceRepository } from "../../runtime/commerce.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PricingRecordIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PricingService {
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

  async listRecords(query: unknown) {
    this.authorization.requireStaffPermission("pricing:read");
    const parsed = parseInput(PricingRecordListQuerySchema, query);
    return PricingRecordListResponseSchema.parse(
      await this.stateStore.listPricingRecords(parsed),
    );
  }

  async preview(body: unknown) {
    const input = parseInput(PricingPreviewRequestSchema, body);
    const item = await this.stateStore.previewPricing(input);
    return PricingPreviewResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  async createRecord(body: unknown) {
    const actor = this.authorization.requireStaffPermission("pricing:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PricingRecordUpsertSchema, body);
    const item = await this.stateStore.upsertPricingRecord({
      variant_id: input.variant_id,
      market: input.market,
      currency: input.currency,
      price_type: input.price_type,
      amount_minor: input.amount_minor,
      min_quantity: input.min_quantity,
      rules: input.rules,
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
      price_list_id: input.price_list_id ?? null,
      dealer_tier_id: input.dealer_tier_id ?? null,
      dealer_company_id: input.dealer_company_id ?? null,
    } as any);

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "pricing.record.create",
      entity: "pricing_record",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return PricingRecordMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateRecord(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("pricing:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(PricingRecordIdParamSchema, { id });
    const input = parseInput(PricingRecordUpsertSchema, body);
    const before = await this.stateStore.getPricingRecordById(parsedId.id);
    const payload: any = { ...input, id: parsedId.id };
    const item = await this.stateStore.upsertPricingRecord(payload);

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "pricing.record.update",
      entity: "pricing_record",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return PricingRecordMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}

