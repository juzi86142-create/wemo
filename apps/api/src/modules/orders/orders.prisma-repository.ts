import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { ORDERS_REPOSITORY, type OrderCreateCommand, type OrdersRepository } from "./orders.repository";
import type { Order, OrderItem, OrderListQuery, OrderStatus } from "@wemo/contracts";
import { DATABASE_CLIENT } from "../../database/database.constants";

@Injectable()
export class OrdersPrismaRepository implements OrdersRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listOrders(query: OrderListQuery): Promise<{ items: Order[]; total: number; page: number; page_size: number }> {
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

  async updateOrderStatus(id: number, status: OrderStatus, note?: string): Promise<Order> {
    const order = await this.database.order.update({
      where: { id },
      data: { status },
    });

    await this.writeStatusAuditLog(id, status, "system", note);

    return this.toOrder(order);
  }

  async reserveInventory(input: { variant_id: number; quantity: number; owner_type: string; owner_id: number; idempotency_key: string; market: string }): Promise<{ id: number }> {
    // Demo 软实现：只校验库存存在性，不写库（inventory_reservations 表已下线）
    const balance = await this.database.inventoryBalance.findFirst({
      where: {
        variantId: input.variant_id,
        market: input.market,
      },
    });

    if (!balance || balance.available < input.quantity) {
      throw new Error("Insufficient inventory");
    }

    console.log("[orders.reserveInventory][demo]", {
      variant_id: input.variant_id,
      quantity: input.quantity,
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      idempotency_key: input.idempotency_key,
      market: input.market,
      balance_id: balance.id,
    });

    return { id: 1 };
  }

  async releaseInventory(reservationId: number, requestId: string, reason: string): Promise<void> {
    // Demo 模式：预留/释放功能已下线，空实现
    void reservationId;
    void requestId;
    void reason;
  }

  async transitionOrder(orderId: number, status: OrderStatus, requestId: string, note?: string): Promise<Order> {
    const order = await this.database.order.update({
      where: { id: orderId },
      data: { status },
    });

    await this.writeStatusAuditLog(orderId, status, requestId, note);

    return this.toOrder(order);
  }

  private async writeStatusAuditLog(orderId: number, status: OrderStatus, requestId: string, note?: string): Promise<void> {
    await this.database.auditLog.create({
      data: {
        actorId: 1, // 演示环境：无认证态时兜底
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
      shipping_minor: 0, // order_items 表无 shipping_minor 列：订单级拆分不可得，按 0 返回
      total_minor: item.totalMinor,
      detail_snapshot: item.detailSnapshot ?? {},
    };
  }
}
