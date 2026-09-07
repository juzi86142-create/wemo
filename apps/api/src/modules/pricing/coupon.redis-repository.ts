import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { Coupon, CouponUpsertInput } from "@wemo/contracts";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";

const COUPONS_KEY = `${REDIS_KEY_PREFIX}:coupons`;
const COUPON_CODE_INDEX_KEY = `${REDIS_KEY_PREFIX}:coupons:by-code`;
const COUPON_USAGE_KEY = `${REDIS_KEY_PREFIX}:coupons:usage`;

export const COUPON_REPOSITORY = Symbol("COUPON_REPOSITORY");

export interface CouponRepository {
  listCoupons(): Promise<Coupon[]>;
  upsertCoupon(input: CouponUpsertInput & { id?: number }): Promise<Coupon>;
  getCouponByCode(code: string): Promise<Coupon | null>;
  recordUsage(couponId: number): Promise<number>;
}

/** 折扣码持久化在 Redis 需求 ADM-PR-004 结算时校验与核销 */
@Injectable()
export class CouponRedisRepository implements CouponRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async listCoupons(): Promise<Coupon[]> {
    const coupons = await readHashAll<Coupon>(
      this.redis,
      COUPONS_KEY,
      (raw) => JSON.parse(raw) as Coupon,
    );
    return coupons.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async upsertCoupon(input: CouponUpsertInput & { id?: number }): Promise<Coupon> {
    const now = new Date().toISOString();
    const id =
      input.id ??
      (await redisNextId(this.redis, `${COUPONS_KEY}:next`));
    const existing = await readHashOne<Coupon>(
      this.redis,
      COUPONS_KEY,
      id,
      (raw) => JSON.parse(raw) as Coupon,
    );
    if (input.id !== undefined && !existing) {
      throw new NotFoundException(`折扣码 ${input.id} 不存在`);
    }
    const usageCount = await readHashOne<number>(
      this.redis,
      COUPON_USAGE_KEY,
      id,
      (raw) => Number(raw),
    );
    const coupon: Coupon = {
      id,
      code: input.code,
      kind: input.kind,
      value_minor: input.value_minor,
      min_amount_minor: input.min_amount_minor ?? null,
      market: input.market ?? null,
      product_ids: input.product_ids ?? [],
      usage_limit: input.usage_limit ?? null,
      usage_count: usageCount ?? 0,
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
      active: input.active ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await writeHashObject(this.redis, COUPONS_KEY, id, coupon);
    await writeHashObject(this.redis, COUPON_CODE_INDEX_KEY, coupon.code, id);
    return coupon;
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const id = await readHashOne<number>(
      this.redis,
      COUPON_CODE_INDEX_KEY,
      code,
      (raw) => Number(raw),
    );
    if (id === null) return null;
    return readHashOne<Coupon>(
      this.redis,
      COUPONS_KEY,
      id,
      (raw) => JSON.parse(raw) as Coupon,
    );
  }

  async recordUsage(couponId: number): Promise<number> {
    return this.redis.hincrby(COUPON_USAGE_KEY, String(couponId), 1);
  }
}
