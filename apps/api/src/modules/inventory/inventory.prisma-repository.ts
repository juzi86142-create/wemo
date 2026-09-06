import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { INVENTORY_REPOSITORY, type InventoryRepository } from "./inventory.repository";
import type {
  InventoryBalance,
  InventoryBalanceListQuery,
  InventoryReservation,
  InventoryReservationCreateInput,
  InventoryReservationListQuery,
} from "@wemo/contracts";
import { DATABASE_CLIENT } from "../../database/database.constants";

@Injectable()
export class InventoryPrismaRepository implements InventoryRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listBalances(query: InventoryBalanceListQuery): Promise<{ items: InventoryBalance[]; total: number; page: number; page_size: number }> {
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

  async listReservations(query: InventoryReservationListQuery): Promise<{ items: InventoryReservation[]; total: number; page: number; page_size: number }> {
    // inventory_reservations 表已下线：库存预占改由订单状态机驱动（orders.reserveInventory 演示软实现）
    return {
      items: [],
      total: 0,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createReservation(input: InventoryReservationCreateInput): Promise<InventoryReservation> {
    void input;
    throw new Error("Demo模式：暂不支持库存预占");
  }

  async releaseReservation(reservationId: number): Promise<void> {
    void reservationId;
    // Demo 模式：预留功能已下线，空实现
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
      synced_at: balance.syncedAt?.toISOString() ?? balance.updatedAt.toISOString(),
      updated_at: balance.updatedAt.toISOString(),
    };
  }
}
