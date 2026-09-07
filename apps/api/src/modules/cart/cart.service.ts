import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CartItemUpsertSchema,
  CartListQuerySchema,
  CartListResponseSchema,
  CartMergeSchema,
  CartMutationResponseSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CartRedisRepository } from "./cart.redis-repository";
import { CART_REPOSITORY } from "./cart.repository";
import { PricingPrismaRepository } from "../pricing/pricing.prisma-repository";
import { PRICING_REPOSITORY } from "../pricing/pricing.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const CartIdParamSchema = z.object({
  id: EntityIdSchema,
});

type CartRuntimeContext = {
  channel: "guest" | "user" | "dealer";
  user_id: number | null;
  company_id: number | null;
  market: string;
  currency: string;
  dealer_company_id: number | undefined;
  guest_cart_id: string | null;
};

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRedisRepository,
    @Inject(PRICING_REPOSITORY)
    private readonly pricingRepository: PricingPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  private resolveContext(): CartRuntimeContext {
    const context = this.requestContext.requireContext();
    const actor = context.actor;
    const channel =
      actor?.audience === "dealer"
        ? "dealer"
        : actor?.audience === "user"
          ? "user"
          : "guest";
    return {
      channel,
      user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      company_id: actor?.company_id ?? null,
      market: context.market,
      currency: context.currency,
      dealer_company_id:
        actor?.audience === "dealer" && actor.company_id
          ? actor.company_id
          : undefined,
      guest_cart_id: channel === "guest" ? this.requestContext.getCartId() : null,
    };
  }

  async getCurrent(query: unknown) {
    void query;
    const ctx = this.resolveContext();
    const item = await this.cartRepository.getOrCreateCart(ctx);
    return CartMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  async listCarts(query: unknown) {
    const parsed = parseInput(CartListQuerySchema, query);
    this.authorization.requireStaffPermission("cart:read");
    return CartListResponseSchema.parse(
      await this.cartRepository.listCarts(parsed),
    );
  }

  async addItem(body: unknown) {
    const context = this.requestContext.requireContext();
    const ctx = this.resolveContext();
    const input = parseInput(CartItemUpsertSchema, body);
    // 市场零售开关 需求 5.2 关闭时游客与用户不可加购
    if (ctx.channel !== "dealer") {
      const b2cEnabled = await this.cartRepository.isMarketB2cEnabled(ctx.market);
      if (!b2cEnabled) {
        throw new ForbiddenException("当前市场未开启零售交易");
      }
    }
    const preview = await this.pricingRepository.previewPricing({
      items: [{ variant_id: input.variant_id, quantity: input.quantity }],
      market: ctx.market,
      currency: ctx.currency,
      dealer_company_id: ctx.dealer_company_id,
    });
    // 取价响应与请求行一一对应 缺失即视为变体不可售
    const previewItem = preview.items.find(
      (item) => item.variant_id === input.variant_id,
    );
    if (!previewItem) {
      throw new NotFoundException("变体不可售");
    }
    const cart = await this.cartRepository.getOrCreateCart(ctx);
    const item = await this.cartRepository.upsertCartItem(cart.id, {
      variant_id: input.variant_id,
      quantity: input.quantity,
      unit_price_minor: previewItem.unit_price_minor,
      currency: previewItem.currency,
      snapshot: previewItem.snapshot,
    });
    return CartMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async merge(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(CartMergeSchema, body);
    const item = await this.cartRepository.mergeCarts(input);

    return CartMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
