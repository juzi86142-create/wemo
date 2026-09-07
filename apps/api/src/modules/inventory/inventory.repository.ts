import type { InventoryBalance, InventoryBalanceListQuery, InventoryReservation, InventoryReservationCreateInput, InventoryReservationListQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const INVENTORY_REPOSITORY = Symbol("INVENTORY_REPOSITORY");

/** 库存盘点输入 */
export interface InventoryAdjustInput {
  variant_id: number;
  market: string;
  warehouse_code: string;
  on_hand: number;
  source: string;
}

export interface InventoryRepository {
  listBalances(query: InventoryBalanceListQuery): Promise<{ items: InventoryBalance[]; total: number; page: number; page_size: number }>;
  listReservations(query: InventoryReservationListQuery): Promise<{ items: InventoryReservation[]; total: number; page: number; page_size: number }>;
  createReservation(input: InventoryReservationCreateInput): Promise<InventoryReservation>;
  confirmReservation(reservationId: number): Promise<InventoryReservation | null>;
  releaseReservation(reservationId: number): Promise<void>;
  /** 库存盘点/手工调整 需求 7.6 */
  adjustBalance(input: InventoryAdjustInput): Promise<InventoryBalance>;
}
