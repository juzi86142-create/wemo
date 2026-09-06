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
import { PricingPrismaRepository } from "./pricing.prisma-repository";
import { PRICING_REPOSITORY } from "./pricing.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PricingRecordIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PricingService {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listRecords(query: unknown) {
    this.authorization.requireStaffPermission("pricing:read");
    const parsed = parseInput(PricingRecordListQuerySchema, query);
    return PricingRecordListResponseSchema.parse(
      this.repository.listPriceRecords(parsed),
    );
  }

  preview(body: unknown) {
    const input = parseInput(PricingPreviewRequestSchema, body);
    const item = this.repository.previewPricing(input);
    return PricingPreviewResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  createRecord(body: unknown) {
    const actor = this.authorization.requireStaffPermission("pricing:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(PricingRecordUpsertSchema, body);
    const item = this.repository.createPriceRecord({
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
    });

    return PricingRecordMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateRecord(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("pricing:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(PricingRecordIdParamSchema, { id });
    const input = parseInput(PricingRecordUpsertSchema, body);
    const item = this.repository.createPriceRecord({ ...input, id: parsedId.id });

    return PricingRecordMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
