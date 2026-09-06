import { Inject, Injectable } from "@nestjs/common";
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
import { CartPrismaRepository } from "./cart.prisma-repository";
import { CART_REPOSITORY } from "./cart.repository";
import { PricingPrismaRepository } from "../pricing/pricing.prisma-repository";
import { PRICING_REPOSITORY } from "../pricing/pricing.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const CartIdParamSchema = z.object({
  id: EntityIdSchema,
});

const CartContextSchema = z.object({
  market: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
});

type CartRuntimeContext = {
  channel: "guest" | "user" | "dealer";
  user_id: number | null;
  company_id: number | null;
  market: string;
  currency: string;
  dealer_company_id: number | undefined;
};

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartPrismaRepository,
    @Inject(PRICING_REPOSITORY)
    private readonly pricingRepository: PricingPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  private resolveContext(query?: unknown): CartRuntimeContext {
    const parsed = parseInput(CartContextSchema, query ?? {});
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
      market: parsed.market ?? context.market,
      currency: parsed.currency ?? context.currency,
      dealer_company_id:
        actor?.audience === "dealer" && actor.company_id
          ? actor.company_id
          : undefined,
    };
  }

  async getCurrent(query: unknown) {
    const ctx = this.resolveContext(query);
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
    const ctx = this.resolveContext({});
    const input = parseInput(CartItemUpsertSchema, body);
    const price = (await this.pricingRepository.previewPricing?.({
      items: [{ variant_id: input.variant_id, quantity: input.quantity }],
      market: ctx.market,
      currency: ctx.currency,
      dealer_company_id: ctx.dealer_company_id,
    })) ?? { items: [{ unit_price_minor: 0, line_total_minor: 0 }] };
    const cart = await this.cartRepository.getOrCreateCart(ctx);
    const item = await this.cartRepository.upsertCartItem(cart.id, {
      variant_id: input.variant_id,
      quantity: input.quantity,
      unit_price_minor: price?.items?.[0]?.unit_price_minor ?? 0,
      currency: price?.items?.[0]?.currency ?? ctx.currency,
      snapshot: price?.items?.[0]?.snapshot ?? {},
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
