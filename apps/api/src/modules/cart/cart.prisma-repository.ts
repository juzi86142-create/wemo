import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { CART_REPOSITORY, type CartRepository } from "./cart.repository";
import type { Cart, CartItemUpsertInput, CartListQuery, CartMergeInput, CartMutationResponse } from "@wemo/contracts";

@Injectable()
export class CartPrismaRepository implements CartRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getOrCreateCart(ctx: { channel: string; user_id: number | null; company_id: number | null; market: string; currency: string; dealer_company_id?: number }): Promise<CartMutationResponse["item"]> {
    let cart = await this.database.cart.findFirst({
      where: {
        userId: ctx.user_id ?? undefined,
        companyId: ctx.company_id ?? undefined,
        status: "active",
      },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.database.cart.create({
        data: {
          userId: ctx.user_id,
          companyId: ctx.company_id,
          channel: ctx.channel,
          market: ctx.market,
          currency: ctx.currency,
        },
        include: { items: true },
      });
    }

    return this.mapCart(cart);
  }

  async listCarts(query: CartListQuery): Promise<{ items: Cart[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.user_id) where.userId = query.user_id;
    if (query.company_id) where.companyId = query.company_id;
    if (query.status) where.status = query.status;

    const [carts, total] = await Promise.all([
      this.database.cart.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: { items: true },
        orderBy: { updatedAt: "desc" },
      }),
      this.database.cart.count({ where }),
    ]);

    return {
      items: carts.map(this.mapCart),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async upsertCartItem(cartId: number, input: CartItemUpsertInput): Promise<{ id: number; cart_id: number; variant_id: number; quantity: number; unit_price_minor: number; currency: string }> {
    const item = await this.database.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: input.variant_id } },
      create: {
        cartId,
        variantId: input.variant_id,
        quantity: input.quantity,
      },
      update: {
        quantity: input.quantity,
      },
      select: { id: true, cartId: true, variantId: true, quantity: true },
    });

    // Get price from variant (simplified for demo)
    const variant = await this.database.variant.findUnique({
      where: { id: input.variant_id },
      select: { product: { select: { name: true } } },
    });

    return {
      id: item.id,
      cart_id: item.cartId,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price_minor: 0, // Would join with pricing table
      currency: "USD",
    };
  }

  async removeCartItem(cartId: number, itemId: number): Promise<void> {
    await this.database.cartItem.deleteMany({
      where: { cartId, id: itemId },
    });
  }

  async mergeCarts(input: CartMergeInput): Promise<CartMutationResponse["item"]> {
    const sourceItems = await this.database.cartItem.findMany({
      where: { cartId: input.source_cart_id },
    });

    const targetCart = await this.database.cart.findUnique({
      where: { id: input.target_cart_id },
      include: { items: true },
    });

    if (!targetCart) {
      throw new Error("Target cart not found");
    }

    // Merge items (simplified)
    for (const item of sourceItems) {
      const existingItem = targetCart.items.find(i => i.variantId === item.variantId);
      if (existingItem) {
        await this.database.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        await this.database.cartItem.create({
          data: {
            cartId: input.target_cart_id,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }

    // Clear source cart
    await this.database.cartItem.deleteMany({ where: { cartId: input.source_cart_id } });

    const updatedCart = await this.database.cart.findUnique({
      where: { id: input.target_cart_id },
      include: { items: true },
    });

    return this.mapCart(updatedCart!);
  }

  async clearCart(cartId: number): Promise<void> {
    await this.database.cartItem.deleteMany({ where: { cartId } });
    await this.database.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  }

  async previewPricing(input: { items: { variant_id: number; quantity: number }[]; market: string; currency: string; dealer_company_id?: number }): Promise<{ items: { variant_id: number; quantity: number; unit_price_minor: number; currency: string }[] }> {
    const items = [];
    for (const item of input.items) {
      const price = await this.database.price.findFirst({
        where: {
          variantId: item.variant_id,
          market: input.market,
          currency: input.currency,
          dealerCompanyId: input.dealer_company_id ?? undefined,
        },
        orderBy: { amountMinor: "asc" },
      });

      items.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_minor: price?.amountMinor ?? 0,
        currency: price?.currency ?? input.currency,
      });
    }

    return { items };
  }

  private mapCart(cart: any): Cart {
    return {
      id: cart.id,
      user_id: cart.userId,
      company_id: cart.companyId,
      channel: cart.channel,
      market: cart.market,
      currency: cart.currency,
      status: cart.status,
      items: cart.items?.map((item: any) => ({
        id: item.id,
        cart_id: item.cartId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price_minor: 0,
        currency: cart.currency,
      })) || [],
    };
  }
}
