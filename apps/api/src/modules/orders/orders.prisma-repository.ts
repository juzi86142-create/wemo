import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";

import {
  ORDERS_REPOSITORY,
  type OrderCreateCommand,
  type OrdersRepository,
} from "./orders.repository";
import type {
  Order,
  OrderItem,
  OrderListQuery,
  OrderStatus,
} from "@wemo/contracts";
import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";

const RESERVATIONS_KEY = `${REDIS_KEY_PREFIX}:inventory:reservations`;

/** 订单与订单行持久化在 PostgreSQL 库存预占与状态审计联动 Redis 与审计表 */
@Injectable()
export class OrdersPrismaRepository implements OrdersRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listOrders(
    query: OrderListQuery,
  ): Promise<{
    items: Order[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const where: any = {};
    if (query.user_id) where.userId = query.user_id;
    if (query.company_id) where.companyId = query.company_id;
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      this.database.order.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.order.count({ where }),
    ]);

    return {
      items: await Promise.all(orders.map((order) => this.toOrder(order))),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getOrderById(id: number): Promise<Order | null> {
    const order = await this.database.order.findUnique({
      where: { id },
    });

    return order ? this.toOrder(order) : null;
  }

  async createOrder(input: OrderCreateCommand): Promise<Order> {
    const orderNo = `ORD-${Date.now()}`;

    const order = await this.database.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          requestId: input.request_id,
          channel: input.channel,
          userId: input.user_id,
          companyId: input.company_id,
          currency: input.currency,
          subtotalMinor: input.subtotal_minor,
          taxMinor: input.tax_minor,
          shippingMinor: input.shipping_minor,
          totalMinor: input.total_minor,
          status: input.status,
          addressSnapshot: input.address_snapshot as any,
          pricingSnapshot: input.pricing_snapshot as any,
        },
      });

      if (input.items.length > 0) {
        await tx.orderItem.createMany({
          data: input.items.map((item) => ({
            orderId: created.id,
            variantId: item.variant_id,
            skuSnapshot: item.sku_snapshot,
            nameSnapshot: item.name_snapshot,
            quantity: item.quantity,
            unitPriceMinor: item.unit_price_minor,
            taxMinor: item.tax_minor,
            totalMinor: item.total_minor,
            detailSnapshot: item.detail_snapshot as any,
          })),
        });
      }

      return created;
    });

    return this.toOrder(order);
  }

  async findOrderByRequestId(requestId: string): Promise<Order | null> {
    const order = await this.database.order.findFirst({
      where: { requestId },
    });

    return order ? this.toOrder(order) : null;
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
    note?: string,
  ): Promise<Order> {
    const order = await this.database.order.update({
      where: { id },
      data: { status },
    });

    await this.writeStatusAuditLog(id, status, "system", note);

    return this.toOrder(order);
  }

  async reserveInventory(input: {
    variant_id: number;
    quantity: number;
    owner_type: string;
    owner_id: number;
    idempotency_key: string;
    market: string;
  }): Promise<{ id: number }> {
    const existingByKey = await this.redis.get(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
    );
    if (existingByKey !== null) {
      return { id: Number(existingByKey) };
    }

    const reservationId = await this.database.$transaction(async (tx) => {
      const balance = await tx.inventoryBalance.findFirst({
        where: {
          variantId: input.variant_id,
          market: input.market,
        },
      });

      if (!balance || balance.available < input.quantity) {
        throw new Error("Insufficient inventory");
      }

      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          available: { decrement: input.quantity },
          reserved: { increment: input.quantity },
        },
      });

      return this.redis.incr(`${RESERVATIONS_KEY}:next`);
    });

    const now = new Date().toISOString();
    await this.redis.hset(
      RESERVATIONS_KEY,
      String(reservationId),
      JSON.stringify({
        id: reservationId,
        inventory_balance_id: reservationId,
        owner_type: input.owner_type,
        owner_id: input.owner_id,
        quantity: input.quantity,
        status: "active",
        expires_at: null,
        idempotency_key: input.idempotency_key,
        created_at: now,
        updated_at: now,
      }),
    );

    await this.redis.set(
      `${RESERVATIONS_KEY}:idem:${input.idempotency_key}`,
      String(reservationId),
    );
    return { id: reservationId };
  }

  async releaseInventory(
    reservationId: number,
    requestId: string,
    reason: string,
  ): Promise<void> {
    const raw = await this.redis.hget(RESERVATIONS_KEY, String(reservationId));
    if (!raw) return;
    const reservation = JSON.parse(raw) as {
      inventory_balance_id: number;
      quantity: number;
      status: string;
    };
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

    await this.redis.hset(
      RESERVATIONS_KEY,
      String(reservationId),
      JSON.stringify({
        ...reservation,
        status: "released",
        updated_at: new Date().toISOString(),
      }),
    );

    await this.writeStatusAuditLog(
      reservationId,
      "released" as OrderStatus,
      requestId,
      reason,
    );
  }

  async transitionOrder(
    orderId: number,
    status: OrderStatus,
    requestId: string,
    note?: string,
  ): Promise<Order> {
    const order = await this.database.order.update({
      where: { id: orderId },
      data: { status },
    });

    await this.writeStatusAuditLog(orderId, status, requestId, note);

    return this.toOrder(order);
  }

  private async writeStatusAuditLog(
    orderId: number,
    status: OrderStatus,
    requestId: string,
    note?: string,
  ): Promise<void> {
    await this.database.auditLog.create({
      data: {
        actorId: 1,
        action: `order.status.${status}`,
        entity: "order",
        entityId: orderId,
        after: note !== undefined ? { status, note } : { status },
        requestId,
        ip: null,
      },
    });
  }

  /** orders/order_items 无 relation 字段：订单行明细需单独查询后拼装 */
  private async toOrder(order: any): Promise<Order> {
    const items = await this.database.orderItem.findMany({
      where: { orderId: order.id },
      orderBy: { id: "asc" },
    });

    return this.mapOrder(order, items);
  }

  private mapOrder(order: any, items: any[]): Order {
    return {
      id: order.id,
      order_no: order.orderNo,
      channel: order.channel,
      user_id: order.userId,
      company_id: order.companyId,
      currency: order.currency,
      subtotal_minor: order.subtotalMinor,
      tax_minor: order.taxMinor,
      shipping_minor: order.shippingMinor,
      total_minor: order.totalMinor,
      status: order.status,
      address_snapshot: order.addressSnapshot,
      pricing_snapshot: order.pricingSnapshot,
      items: items.map((item) => this.mapItem(item)),
      status_history: [],
      request_id: order.requestId ?? null,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }

  private mapItem(item: any): OrderItem {
    return {
      id: item.id,
      order_id: item.orderId,
      variant_id: item.variantId,
      sku_snapshot: item.skuSnapshot,
      name_snapshot: item.nameSnapshot,
      quantity: item.quantity,
      unit_price_minor: item.unitPriceMinor,
      tax_minor: item.taxMinor,
      shipping_minor: 0,
      total_minor: item.totalMinor,
      detail_snapshot: item.detailSnapshot ?? {},
    };
  }
}
