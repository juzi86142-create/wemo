import type { Order, OrderCreateInput, OrderListQuery, OrderStatus, OrderUpdateInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const ORDERS_REPOSITORY = Symbol("ORDERS_REPOSITORY");

export interface OrdersRepository {
  listOrders(query: OrderListQuery): Promise<{ items: Order[]; total: number; page: number; page_size: number }>;
  getOrderById(id: number): Promise<Order | null>;
  createOrder(input: OrderCreateInput & { request_id: string; subtotal_minor: number; tax_minor: number; shipping_minor: number; total_minor: number }): Promise<Order>;
  findOrderByRequestId(requestId: string): Promise<Order | null>;
  updateOrderStatus(id: number, status: OrderStatus, note?: string): Promise<Order>;
  reserveInventory(input: { variant_id: number; quantity: number; owner_type: string; owner_id: number; idempotency_key: string; market: string }): Promise<{ id: number }>;
  releaseInventory(reservationId: number, requestId: string, reason: string): Promise<void>;
  transitionOrder(orderId: number, status: string, requestId: string, note?: string): Promise<Order>;
}
