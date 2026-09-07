import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";

import {
  ORDERS_REPOSITORY,
  type OrderCreateCommand,
  type OrdersRepository,
} from "./orders.repository";
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
} from "../audit/audit.repository";
import type {
  Order,
  OrderItem,
  OrderListQuery,
  OrderStatus,
  Shipment,
  ShipmentCreateInput,
} from "@wemo/contracts";
import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { generateBusinessNo } from "../../runtime/ids";

const RESERVATIONS_KEY = `${REDIS_KEY_PREFIX}:inventory:reservations`;

/** 订单与订单行持久化在 PostgreSQL 库存预占与状态审计联动 Redis 与审计表 */
@Injectable()
export class OrdersPrismaRepository implements OrdersRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(AUDIT_REPOSITORY) private readonly audit: AuditRepository,
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
    const orderNo = generateBusinessNo("ORD");

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

  // 库存预占由 inventory 模块的 createReservation 承担 本模块不再重复实现

  async transitionOrder(
    orderId: number,
    status: OrderStatus,
    requestId: string,
    actorId: number | null,
    note?: string,
  ): Promise<Order> {
    const order = await this.database.order.update({
      where: { id: orderId },
      data: { status },
    });

    await this.writeStatusAuditLog(orderId, status, requestId, actorId, note);

    return this.toOrder(order);
  }

  private async writeStatusAuditLog(
    orderId: number,
    status: OrderStatus,
    requestId: string,
    actorId: number | null,
    note?: string,
  ): Promise<void> {
    await this.audit.recordLog({
      actor_id: actorId,
      action: `order.status.${status}`,
      entity: "order",
      entity_id: orderId,
      after: note !== undefined ? { status, note } : { status },
      request_id: requestId,
      ip: null,
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

  async getMarketCommerceSettings(
    market: string,
  ): Promise<{ b2c_enabled: boolean; dealer_enabled: boolean }> {
    const row = await this.database.market.findUnique({
      where: { code: market },
    });
    const settings = (row?.settings ?? {}) as Record<string, unknown>;
    return {
      b2c_enabled: settings.b2c_enabled !== false,
      dealer_enabled: settings.dealer_enabled !== false,
    };
  }

  async getVariantIdentity(
    variantIds: number[],
  ): Promise<Map<number, { sku: string; name: string; product_id: number }>> {
    if (variantIds.length === 0) return new Map();
    const variants = await this.database.variant.findMany({
      where: { id: { in: variantIds } },
    });
    const translations = await this.database.productTranslation.findMany({
      where: { productId: { in: variants.map((v) => v.productId) } },
    });
    const nameByProduct = new Map<number, string>();
    for (const translation of translations) {
      if (!nameByProduct.has(translation.productId)) {
        nameByProduct.set(translation.productId, translation.name);
      }
    }
    const identity = new Map<
      number,
      { sku: string; name: string; product_id: number }
    >();
    for (const variant of variants) {
      identity.set(variant.id, {
        sku: variant.sku,
        name: nameByProduct.get(variant.productId) ?? `Variant ${variant.id}`,
        product_id: variant.productId,
      });
    }
    return identity;
  }

  async getAvailableStock(
    variantIds: number[],
    market: string,
  ): Promise<Map<number, number>> {
    if (variantIds.length === 0) return new Map();
    const balances = await this.database.inventoryBalance.findMany({
      where: { variantId: { in: variantIds }, market },
    });
    const stock = new Map<number, number>();
    for (const balance of balances) {
      stock.set(
        balance.variantId,
        (stock.get(balance.variantId) ?? 0) + balance.available,
      );
    }
    return stock;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await this.database.orderItem.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
    });
    return items.map((item) => this.mapItem(item));
  }

  async listShipments(orderId: number): Promise<Shipment[]> {
    const rows = await this.database.shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapShipment(row));
  }

  async createShipment(
    orderId: number,
    input: ShipmentCreateInput,
    actorId: number,
    requestId: string,
  ): Promise<{ shipment: Shipment; order: Order }> {
    const order = await this.database.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    const orderItems = await this.database.orderItem.findMany({
      where: { orderId },
    });
    const shipments = await this.database.shipment.findMany({
      where: { orderId },
    });
    const shippedByItem = new Map<number, number>();
    for (const shipment of shipments) {
      for (const item of (shipment.items ?? []) as Array<{
        order_item_id: number;
        quantity: number;
      }>) {
        shippedByItem.set(
          item.order_item_id,
          (shippedByItem.get(item.order_item_id) ?? 0) + item.quantity,
        );
      }
    }
    for (const item of input.items) {
      const orderItem = orderItems.find((row) => row.id === item.order_item_id);
      if (!orderItem) {
        throw new NotFoundException(`订单行 ${item.order_item_id} 不存在`);
      }
      const remaining =
        orderItem.quantity - (shippedByItem.get(item.order_item_id) ?? 0);
      if (item.quantity > remaining) {
        throw new ForbiddenException(
          `订单行 ${item.order_item_id} 可发货数量仅剩 ${remaining}`,
        );
      }
    }

    const shipped = await this.database.shipment.create({
      data: {
        orderId,
        carrier: input.carrier,
        trackingNo: input.tracking_no,
        status: "created",
        items: input.items as never,
        shippedAt: new Date(),
      },
    });

    // 全部行项发满则整单 shipped 否则 partially_shipped（需求 8.3/8.4 分批发货）
    const afterShippedByItem = new Map(shippedByItem);
    for (const item of input.items) {
      afterShippedByItem.set(
        item.order_item_id,
        (afterShippedByItem.get(item.order_item_id) ?? 0) + item.quantity,
      );
    }
    const allShipped = orderItems.every(
      (orderItem) =>
        (afterShippedByItem.get(orderItem.id) ?? 0) >= orderItem.quantity,
    );
    const nextStatus = allShipped ? "shipped" : "partially_shipped";
    const updatedOrder = await this.database.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    await this.audit.recordLog({
      actor_id: actorId,
      action: `order.shipment.created`,
      entity: "order",
      entity_id: orderId,
      after: {
        shipment_id: shipped.id,
        tracking_no: input.tracking_no,
        status: nextStatus,
      },
      request_id: requestId,
      ip: null,
    });

    return {
      shipment: this.mapShipment(shipped),
      order: await this.toOrder(updatedOrder),
    };
  }

  private mapShipment(row: any): Shipment {
    return {
      id: row.id,
      order_id: row.orderId,
      carrier: row.carrier,
      tracking_no: row.trackingNo,
      status: row.status,
      items: row.items ?? [],
      shipped_at: row.shippedAt ? row.shippedAt.toISOString() : null,
      created_at: row.createdAt.toISOString(),
    };
  }
}
