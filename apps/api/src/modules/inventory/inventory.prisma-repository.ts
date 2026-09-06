import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { INVENTORY_REPOSITORY, type InventoryRepository } from "./inventory.repository";
import type { InventoryBalance, InventoryReservation } from "@wemo/contracts";

@Injectable()
export class InventoryPrismaRepository implements InventoryRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listBalances(query: any): Promise<{ items: InventoryBalance[]; total: number; page: number; page_size: number }> {
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
      items: balances.map(b => this.mapBalance(b)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async listReservations(query: any): Promise<{ items: InventoryReservation[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.owner_type) where.ownerType = query.owner_type;
    if (query.owner_id) where.ownerId = query.owner_id;
    if (query.status) where.status = query.status;

    const [reservations, total] = await Promise.all([
      this.database.inventoryReservation.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: { balance: true },
      }),
      this.database.inventoryReservation.count({ where }),
    ]);

    return {
      items: reservations.map(r => this.mapReservation(r)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createReservation(input: any): Promise<InventoryReservation> {
    const reservation = await this.database.inventoryReservation.create({
      data: {
        inventoryBalanceId: input.inventory_balance_id,
        ownerType: input.owner_type,
        ownerId: input.owner_id,
        quantity: input.quantity,
        status: "active",
        idempotencyKey: input.idempotency_key,
        expiresAt: input.expires_at ? new Date(input.expires_at) : null,
      },
    });

    return this.mapReservation(reservation);
  }

  async releaseReservation(reservationId: number): Promise<void> {
    const reservation = await this.database.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) return;

    await this.database.$transaction(async (tx) => {
      await tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { status: "released" },
      });

      await tx.inventoryBalance.update({
        where: { id: reservation.inventoryBalanceId },
        data: {
          reserved: { decrement: reservation.quantity },
          available: { increment: reservation.quantity },
        },
      });
    });
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
      synced_at: balance.syncedAt?.toISOString() || null,
      updated_at: balance.updatedAt.toISOString(),
    };
  }

  private mapReservation(reservation: any): InventoryReservation {
    return {
      id: reservation.id,
      inventory_balance_id: reservation.inventoryBalanceId,
      owner_type: reservation.ownerType,
      owner_id: reservation.ownerId,
      quantity: reservation.quantity,
      status: reservation.status,
      expires_at: reservation.expiresAt?.toISOString() || null,
      created_at: reservation.createdAt.toISOString(),
    };
  }
}
