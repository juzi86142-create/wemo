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
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";

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
    const reservations = await readHashAll<InventoryReservation>(
      this.redis,
      RESERVATIONS_KEY,
      (raw) => JSON.parse(raw) as InventoryReservation,
    );
    return paginate(reservations, query, {
      exact: {
        inventory_balance_id: query.inventory_balance_id,
        owner_type: query.owner_type,
        owner_id: query.owner_id,
        status: query.status,
      },
      sortBy: (a, b) => b.created_at.localeCompare(a.created_at),
    });
  }

  async createReservation(
    input: InventoryReservationCreateInput,
  ): Promise<InventoryReservation> {
    const existingByKey = await this.redis.get(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
    );
    if (existingByKey !== null) {
      const existing = await readHashOne<InventoryReservation>(
        this.redis,
        RESERVATIONS_KEY,
        existingByKey,
        (raw) => JSON.parse(raw) as InventoryReservation,
      );
      if (existing) {
        return existing;
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
        id: await redisNextId(this.redis, `${RESERVATIONS_KEY}:next`),
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

    await writeHashObject(
      this.redis,
      RESERVATIONS_KEY,
      reservation.id,
      reservation,
    );
    await this.redis.set(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
      String(reservation.id),
    );
    return reservation;
  }

  async releaseReservation(reservationId: number): Promise<void> {
    const reservation = await readHashOne<InventoryReservation>(
      this.redis,
      RESERVATIONS_KEY,
      reservationId,
      (raw) => JSON.parse(raw) as InventoryReservation,
    );
    if (!reservation) return;
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

    await writeHashObject(this.redis, RESERVATIONS_KEY, reservationId, released);
  }

  async confirmReservation(
    reservationId: number,
  ): Promise<InventoryReservation | null> {
    const reservation = await readHashOne<InventoryReservation>(
      this.redis,
      RESERVATIONS_KEY,
      reservationId,
      (raw) => JSON.parse(raw) as InventoryReservation,
    );
    if (!reservation || reservation.status !== "active") return null;

    const confirmed: InventoryReservation = {
      ...reservation,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    };
    await writeHashObject(this.redis, RESERVATIONS_KEY, reservationId, confirmed);
    return confirmed;
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
