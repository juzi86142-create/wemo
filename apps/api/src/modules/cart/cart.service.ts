import { Inject, Injectable } from "@nestjs/common";
import {
  CartItemUpsertSchema,
  CartListQuerySchema,
  CartListResponseSchema,
  CartMergeSchema,
  CartMutationResponseSchema,
  PricingPreviewRequestSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { CommerceStateStore } from "../../runtime/commerce.state";
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
    @Inject(CommerceStateStore)
    private readonly stateStore: CommerceStateStore,
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

  getCurrent(query: unknown) {
    const ctx = this.resolveContext(query);
    const item = this.stateStore.getOrCreateCart(ctx);
    return CartMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  listCarts(query: unknown) {
    const parsed = parseInput(CartListQuerySchema, query);
    this.authorization.requireStaffPermission("cart:read");
    return CartListResponseSchema.parse(this.stateStore.listCarts(parsed));
  }

  addItem(body: unknown) {
    const context = this.requestContext.requireContext();
    const ctx = this.resolveContext({});
    const input = parseInput(CartItemUpsertSchema, body);
    const price = this.stateStore.previewPricing({
      items: [{ variant_id: input.variant_id, quantity: input.quantity }],
      market: ctx.market,
      currency: ctx.currency,
      dealer_company_id: ctx.dealer_company_id,
    }).items[0];
    const cart = this.stateStore.getOrCreateCart(ctx);
    const item = this.stateStore.upsertCartItem(cart.id, {
      variant_id: input.variant_id,
      quantity: input.quantity,
      unit_price_minor: price?.unit_price_minor ?? 0,
      currency: price?.currency ?? ctx.currency,
      snapshot: price?.snapshot ?? {},
    });
    return CartMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  merge(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(CartMergeSchema, body);
    const item = this.stateStore.mergeCart(
      input.source_cart_id,
      input.target_cart_id,
    );
    return CartMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
