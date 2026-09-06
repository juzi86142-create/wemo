import type { InventoryBalance, InventoryBalanceListQuery, InventoryReservation, InventoryReservationCreateInput, InventoryReservationListQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const INVENTORY_REPOSITORY = Symbol("INVENTORY_REPOSITORY");

export interface InventoryRepository {
  listBalances(query: InventoryBalanceListQuery): Promise<{ items: InventoryBalance[]; total: number; page: number; page_size: number }>;
  listReservations(query: InventoryReservationListQuery): Promise<{ items: InventoryReservation[]; total: number; page: number; page_size: number }>;
  createReservation(input: InventoryReservationCreateInput): Promise<InventoryReservation>;
  releaseReservation(reservationId: number): Promise<void>;
}
