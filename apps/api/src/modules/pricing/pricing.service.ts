import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  CouponListResponseSchema,
  CouponMutationResponseSchema,
  CouponUpsertSchema,
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
import { listResponse } from "../../runtime/list-response";
import { PricingPrismaRepository } from "./pricing.prisma-repository";
import { PRICING_REPOSITORY } from "./pricing.repository";
import {
  COUPON_REPOSITORY,
  type CouponRepository,
} from "./coupon.redis-repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const PricingRecordIdParamSchema = z.object({
  id: EntityIdSchema,
});

const CouponIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class PricingService {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingPrismaRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  /** 折扣码管理 需求 ADM-PR-004 */
  async listCoupons() {
    this.authorization.requireStaffPermission("pricing:read");
    const coupons = await this.couponRepository.listCoupons();
    return CouponListResponseSchema.parse(listResponse(coupons));
  }

  async upsertCoupon(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("pricing:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(CouponUpsertSchema, body);
    const payload =
      id === undefined
        ? input
        : {
            ...input,
            id: parseInput(CouponIdParamSchema, { id }).id,
          };
    const item = await this.couponRepository.upsertCoupon(payload);

    return CouponMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listRecords(query: unknown) {
    this.authorization.requireStaffPermission("pricing:read");
    const parsed = parseInput(PricingRecordListQuerySchema, query);
    return PricingRecordListResponseSchema.parse(
      this.repository.listPriceRecords(parsed),
    );
  }

  preview(body: unknown) {
    const input = parseInput(PricingPreviewRequestSchema, body);
    const actor = this.requestContext.getActor();
    // 经销商价维度仅员工或本企业可查 游客与用户只能看零售
    if (input.dealer_company_id !== undefined) {
      if (!actor) {
        throw new UnauthorizedException("缺少认证上下文");
      }
      if (
        actor.audience !== "staff" &&
        actor.company_id !== input.dealer_company_id
      ) {
        throw new ForbiddenException("无权查询其他企业价格");
      }
    }
    if (
      input.dealer_tier_id !== undefined ||
      input.price_list_id !== undefined
    ) {
      if (actor?.audience !== "staff") {
        throw new ForbiddenException("价格表与等级价仅员工可查");
      }
    }
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
    const item = this.repository.createPriceRecord({
      ...input,
      id: parsedId.id,
    } as any);

    return PricingRecordMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
