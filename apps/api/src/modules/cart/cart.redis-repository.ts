import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { Cart, CartItemUpsertInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";
import {
  CART_REPOSITORY,
  type CartContext,
  type CartItemPricingInput,
  type CartMergeInput,
  type CartPage,
  type CartPreviewPricingInput,
  type CartPreviewPricingResult,
  type CartRepository,
} from "./cart.repository";

type StoredCartItem = Cart["items"][number];

const PREFIX = `${REDIS_KEY_PREFIX}:cart`;

function cartKey(id: number): string {
  return `${PREFIX}:${id}`;
}

function itemsKey(id: number): string {
  return `${PREFIX}:${id}:items`;
}

function userIndexKey(userId: number): string {
  return `${PREFIX}:by-user:${userId}`;
}

function cartIndexKey(): string {
  return `${PREFIX}:index`;
}

import { nowIso } from "../../runtime/time";

function expiresIso(days = 7): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** 购物车数据持久化在 Redis 登录用户按 user_id 索引复用购物车 游客每次新建由客户端保存购物车 ID */
@Injectable()
export class CartRedisRepository implements CartRepository {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  /** 获取或创建购物车 登录用户复用已有购物车 游客新建 */
  async getOrCreateCart(ctx: CartContext): Promise<Cart> {
    if (ctx.user_id !== null) {
      const existingId = await this.redis.get(userIndexKey(ctx.user_id));
      if (existingId !== null) {
        const cart = await this.loadCart(Number(existingId));
        if (cart) return cart;
      }
    }

    const id = await redisNextId(this.redis, `${PREFIX}:next`);
    const created = nowIso();
    const cart: Cart = {
      id,
      user_id: ctx.user_id,
      company_id: ctx.company_id,
      channel: ctx.channel as Cart["channel"],
      market: ctx.market,
      currency: ctx.currency,
      status: "active",
      items: [],
      subtotal_minor: 0,
      total_minor: 0,
      updated_at: created,
      expires_at: expiresIso(),
      created_at: created,
    };
    await this.saveCart(cart);
    await this.redis.sadd(cartIndexKey(), String(id));
    if (ctx.user_id !== null) {
      await this.redis.set(userIndexKey(ctx.user_id), String(id));
    }
    return cart;
  }

  /** 分页列出购物车 按 user_id 过滤时命中用户索引 */
  async listCarts(query: {
    page: number;
    page_size: number;
    user_id?: number | undefined;
    company_id?: number | undefined;
    status?: Cart["status"] | undefined;
    channel?: Cart["channel"] | undefined;
  }): Promise<CartPage> {
    if (query.user_id !== undefined) {
      const cartId = await this.redis.get(userIndexKey(query.user_id));
      if (cartId === null) {
        return {
          items: [],
          total: 0,
          page: query.page,
          page_size: query.page_size,
        };
      }
      const cart = await this.loadCart(Number(cartId));
      return {
        items: cart ? [cart] : [],
        total: cart ? 1 : 0,
        page: query.page,
        page_size: query.page_size,
      };
    }

    const members = await this.redis.smembers(cartIndexKey());
    const cartIds = members.map(Number);
    const carts = (
      await Promise.all(cartIds.map((id) => this.loadCart(id)))
    ).filter((cart): cart is Cart => cart !== null);

    return paginate(carts, query, {
      exact: {
        company_id: query.company_id,
        status: query.status,
        channel: query.channel,
      },
    });
  }

  /** 新增或更新购物车行并重算金额 */
  async upsertCartItem(
    cartId: number,
    input: CartItemPricingInput,
  ): Promise<Cart> {
    const cart = await this.loadCart(cartId);
    if (!cart) {
      throw new NotFoundException(`购物车 ${cartId} 不存在`);
    }

    const itemsKeyName = itemsKey(cartId);
    const existingItem = await readHashOne<StoredCartItem>(
      this.redis,
      itemsKeyName,
      input.variant_id,
      (raw) => JSON.parse(raw) as StoredCartItem,
    );
    const addedAt = existingItem ? existingItem.added_at : nowIso();
    const item: StoredCartItem = {
      id: input.variant_id,
      variant_id: input.variant_id,
      quantity: input.quantity,
      unit_price_minor: input.unit_price_minor,
      line_total_minor: input.unit_price_minor * input.quantity,
      currency: input.currency,
      snapshot: (input.snapshot ?? {}) as StoredCartItem["snapshot"],
      added_at: addedAt,
      updated_at: nowIso(),
    };
    await writeHashObject(this.redis, itemsKeyName, input.variant_id, item);

    return this.reloadTotals(cart);
  }

  /** 删除购物车行并重算金额 */
  async removeCartItem(cartId: number, itemId: number): Promise<void> {
    await this.redis.hdel(itemsKey(cartId), String(itemId));
    const cart = await this.loadCart(cartId);
    if (cart) {
      await this.reloadTotals(cart);
    }
  }

  /** 合并两个购物车 源购物车行并入目标购物车后清空源购物车 */
  async mergeCarts(input: CartMergeInput): Promise<Cart> {
    const sourceId = input.source_cart_id;
    const targetId =
      input.target_cart_id ?? (await this.findOrCreateTargetId(sourceId));

    const sourceItems = await this.readItems(sourceId);
    const targetItems = await this.readItems(targetId);

    for (const [variantId, raw] of sourceItems.entries()) {
      const source = JSON.parse(raw) as StoredCartItem;
      const existingRaw = targetItems.get(variantId);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as StoredCartItem;
        const merged: StoredCartItem = {
          ...existing,
          quantity: existing.quantity + source.quantity,
          line_total_minor:
            existing.unit_price_minor * (existing.quantity + source.quantity),
          updated_at: nowIso(),
        };
        await writeHashObject(this.redis, itemsKey(targetId), variantId, merged);
      } else {
        await this.redis.hset(itemsKey(targetId), variantId, raw);
      }
    }

    await this.redis.del(itemsKey(sourceId));

    const target = await this.loadCart(targetId);
    if (!target) {
      throw new NotFoundException(`目标购物车 ${targetId} 不存在`);
    }
    return this.reloadTotals(target);
  }

  /** 清空购物车全部行 */
  async clearCart(cartId: number): Promise<void> {
    await this.redis.del(itemsKey(cartId));
    const cart = await this.loadCart(cartId);
    if (cart) {
      await this.reloadTotals(cart);
    }
  }

  /** 基于 prices 表计算购物车行单价与行总额 */
  async previewPricing(
    input: CartPreviewPricingInput,
  ): Promise<CartPreviewPricingResult> {
    const items = await Promise.all(
      input.items.map(async (item) => {
        const price = await this.database.price.findFirst({
          where: {
            variantId: item.variant_id,
            market: input.market,
            currency: input.currency,
            ...(input.dealer_company_id !== undefined
              ? { dealerCompanyId: input.dealer_company_id }
              : {}),
          },
          orderBy: { amountMinor: "asc" },
        });
        const unit = price?.amountMinor ?? 0;
        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price_minor: unit,
          line_total_minor: unit * item.quantity,
          currency: price?.currency ?? input.currency,
          snapshot: {},
        };
      }),
    );
    return { items };
  }

  private async findOrCreateTargetId(sourceId: number): Promise<number> {
    const source = await this.loadCart(sourceId);
    if (!source) {
      throw new NotFoundException(`购物车 ${sourceId} 不存在`);
    }
    if (source.user_id !== null) {
      const existingId = await this.redis.get(userIndexKey(source.user_id));
      if (existingId !== null) {
        return Number(existingId);
      }
    }
    return (
      await this.getOrCreateCart({
        channel: source.channel as CartContext["channel"],
        user_id: source.user_id,
        company_id: source.company_id,
        market: source.market,
        currency: source.currency,
        dealer_company_id: undefined,
      })
    ).id;
  }

  private async readItems(cartId: number): Promise<Map<string, string>> {
    const raw = await this.redis.hgetall(itemsKey(cartId));
    return new Map(Object.entries(raw));
  }

  private async loadCart(id: number): Promise<Cart | null> {
    const results = await this.redis
      .pipeline()
      .hgetall(cartKey(id))
      .hgetall(itemsKey(id))
      .exec();
    if (!results) return null;
    const headerMap = results[0]?.[1] as Record<string, string> | undefined;
    if (!headerMap || !headerMap.id) return null;
    const itemRaw = results[1]?.[1] as Record<string, string> | undefined;
    const items = Object.entries(itemRaw ?? {})
      .map(([, raw]) => JSON.parse(raw as string) as StoredCartItem)
      .sort((a, b) => a.added_at.localeCompare(b.added_at));
    return {
      id: Number(headerMap.id),
      user_id: headerMap.user_id === "" ? null : Number(headerMap.user_id),
      company_id:
        headerMap.company_id === "" ? null : Number(headerMap.company_id),
      channel: headerMap.channel as Cart["channel"],
      market: headerMap.market ?? "",
      currency: headerMap.currency ?? "USD",
      status: headerMap.status as Cart["status"],
      items,
      subtotal_minor: Number(headerMap.subtotal_minor ?? 0),
      total_minor: Number(headerMap.total_minor ?? 0),
      updated_at: headerMap.updated_at ?? new Date().toISOString(),
      expires_at:
        headerMap.expires_at === "" || headerMap.expires_at === undefined
          ? null
          : headerMap.expires_at,
      created_at: headerMap.created_at ?? new Date().toISOString(),
    };
  }

  private async saveCart(cart: Cart): Promise<void> {
    const data: Record<string, string> = {
      id: String(cart.id),
      user_id: cart.user_id === null ? "" : String(cart.user_id),
      company_id: cart.company_id === null ? "" : String(cart.company_id),
      channel: cart.channel,
      market: cart.market,
      currency: cart.currency,
      status: cart.status,
      subtotal_minor: String(cart.subtotal_minor),
      total_minor: String(cart.total_minor),
      updated_at: cart.updated_at,
      expires_at: cart.expires_at ?? "",
      created_at: cart.created_at,
    };
    await this.redis.hset(cartKey(cart.id), data);
  }

  private async reloadTotals(cart: Cart): Promise<Cart> {
    const items = await readHashAll<StoredCartItem>(
      this.redis,
      itemsKey(cart.id),
      (raw) => JSON.parse(raw) as StoredCartItem,
    );
    items.sort((a, b) => a.added_at.localeCompare(b.added_at));
    const subtotal = items.reduce(
      (sum, item) => sum + item.line_total_minor,
      0,
    );
    const updated: Cart = {
      ...cart,
      items,
      subtotal_minor: subtotal,
      total_minor: subtotal,
      updated_at: nowIso(),
    };
    await this.saveCart(updated);
    return updated;
  }
}
