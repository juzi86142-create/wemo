import { Inject, Injectable } from "@nestjs/common";
import type { Cart, CartListQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  type CartContext,
  type CartItemPricingInput,
  type CartMergeInput,
  type CartPage,
  type CartPreviewPricingInput,
  type CartPreviewPricingResult,
  type CartRepository,
} from "./cart.repository";

const DEMO_CART_NOT_SUPPORTED = "Demo模式：暂不支持购物车持久化";

/**
 * Demo 模式：carts/cart_items 表已从数据库中移除，
 * 购物车读写方法一律抛出明确错误，仅 previewPricing 基于 price 表真实计价。
 */
@Injectable()
export class CartPrismaRepository implements CartRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getOrCreateCart(ctx: CartContext): Promise<Cart> {
    throw new Error(DEMO_CART_NOT_SUPPORTED);
  }

  async listCarts(query: CartListQuery): Promise<CartPage> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async upsertCartItem(
    cartId: number,
    input: CartItemPricingInput,
  ): Promise<Cart> {
    throw new Error(DEMO_CART_NOT_SUPPORTED);
  }

  async removeCartItem(cartId: number, itemId: number): Promise<void> {
    // Demo：购物车无持久化，无需清理
  }

  async mergeCarts(input: CartMergeInput): Promise<Cart> {
    throw new Error(DEMO_CART_NOT_SUPPORTED);
  }

  async clearCart(cartId: number): Promise<void> {
    // Demo：购物车无持久化，无需清理
  }

  async previewPricing(
    input: CartPreviewPricingInput,
  ): Promise<CartPreviewPricingResult> {
    const prices = await this.database.price.findMany({
      where: {
        variantId: { in: input.items.map(item => item.variant_id) },
        market: input.market,
        currency: input.currency,
        dealerCompanyId: input.dealer_company_id ?? null,
      },
      orderBy: { amountMinor: "asc" },
    });

    const priceMap = new Map(
      prices.map(price => [price.variantId, price] as const),
    );

    return {
      items: input.items.map(item => {
        const price = priceMap.get(item.variant_id);
        const unitPrice = price?.amountMinor ?? 0;
        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price_minor: unitPrice,
          line_total_minor: unitPrice * item.quantity,
          currency: price?.currency ?? input.currency,
          snapshot: price?.rules ?? {},
        };
      }),
    };
  }
}
