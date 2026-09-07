import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";

import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from "./inventory.repository";
import type {
  InventoryBalance,
  InventoryBalanceListQuery,
  InventoryReservation,
  InventoryReservationCreateInput,
  InventoryReservationListQuery,
} from "@wemo/contracts";
import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";

const RESERVATIONS_KEY = `${REDIS_KEY_PREFIX}:inventory:reservations`;

/** 库存余额持久化在 PostgreSQL 预占记录持久化在 Redis */
@Injectable()
export class InventoryPrismaRepository implements InventoryRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listBalances(
    query: InventoryBalanceListQuery,
  ): Promise<{
    items: InventoryBalance[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where: any = {};
    if (query.variant_id) where.variantId = query.variant_id;
    if (query.warehouse_code) where.warehouseCode = query.warehouse_code;
    if (query.market) where.market = query.market;

    const [balances, total] = await Promise.all([
      this.database.inventoryBalance.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.inventoryBalance.count({ where }),
    ]);

    return {
      items: balances.map((b) => this.mapBalance(b)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async listReservations(
    query: InventoryReservationListQuery,
  ): Promise<{
    items: InventoryReservation[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const raw = await this.redis.hgetall(RESERVATIONS_KEY);
    let reservations = Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as InventoryReservation)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (query.inventory_balance_id !== undefined) {
      reservations = reservations.filter(
        (r) => r.inventory_balance_id === query.inventory_balance_id,
      );
    }
    if (query.owner_type !== undefined) {
      reservations = reservations.filter(
        (r) => r.owner_type === query.owner_type,
      );
    }
    if (query.owner_id !== undefined) {
      reservations = reservations.filter((r) => r.owner_id === query.owner_id);
    }
    if (query.status !== undefined) {
      reservations = reservations.filter((r) => r.status === query.status);
    }

    const start = (query.page - 1) * query.page_size;
    return {
      items: reservations.slice(start, start + query.page_size),
      total: reservations.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createReservation(
    input: InventoryReservationCreateInput,
  ): Promise<InventoryReservation> {
    const existingByKey = await this.redis.get(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
    );
    if (existingByKey !== null) {
      const existing = await this.redis.hget(RESERVATIONS_KEY, existingByKey);
      if (existing) {
        return JSON.parse(existing) as InventoryReservation;
      }
    }

    const reservation = await this.database.$transaction(async (tx) => {
      const balance = await tx.inventoryBalance.findFirst({
        where: {
          variantId: input.variant_id,
          ...(input.market !== undefined ? { market: input.market } : {}),
          ...(input.warehouse_code !== undefined
            ? { warehouseCode: input.warehouse_code }
            : {}),
        },
      });
      if (!balance || balance.available < input.quantity) {
        throw new Error("库存不足或余额不存在");
      }

      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          available: { decrement: input.quantity },
          reserved: { increment: input.quantity },
        },
      });

      const now = new Date().toISOString();
      return {
        id: await this.redis.incr(`${RESERVATIONS_KEY}:next`),
        inventory_balance_id: balance.id,
        owner_type: input.owner_type,
        owner_id: input.owner_id,
        quantity: input.quantity,
        status: "active" as const,
        expires_at: input.expires_at ?? null,
        idempotency_key: input.idempotency_key,
        created_at: now,
        updated_at: now,
      } satisfies InventoryReservation;
    });

    await this.redis.hset(
      RESERVATIONS_KEY,
      String(reservation.id),
      JSON.stringify(reservation),
    );
    await this.redis.set(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
      String(reservation.id),
    );
    return reservation;
  }

  async releaseReservation(reservationId: number): Promise<void> {
    const raw = await this.redis.hget(RESERVATIONS_KEY, String(reservationId));
    if (!raw) return;
    const reservation = JSON.parse(raw) as InventoryReservation;
    if (reservation.status !== "active") return;

    await this.database.$transaction(async (tx) => {
      await tx.inventoryBalance.update({
        where: { id: reservation.inventory_balance_id },
        data: {
          available: { increment: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });
    });

    const released: InventoryReservation = {
      ...reservation,
      status: "released",
      updated_at: new Date().toISOString(),
    };

    await this.redis.hset(
      RESERVATIONS_KEY,
      String(reservationId),
      JSON.stringify(released),
    );
  }

  private mapBalance(balance: any): InventoryBalance {
    return {
      id: balance.id,
      variant_id: balance.variantId,
      warehouse_code: balance.warehouseCode,
      market: balance.market,
      on_hand: balance.onHand,
      available: balance.available,
      reserved: balance.reserved,
      source: balance.source,
      synced_at:
        balance.syncedAt?.toISOString() ?? balance.updatedAt.toISOString(),
      updated_at: balance.updatedAt.toISOString(),
    };
  }
}
