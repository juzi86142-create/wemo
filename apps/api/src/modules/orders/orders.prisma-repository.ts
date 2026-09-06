import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { ORDERS_REPOSITORY, type OrdersRepository } from "./orders.repository";
import type { Order, OrderCreateInput } from "@wemo/contracts";

@Injectable()
export class OrdersPrismaRepository implements OrdersRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listOrders(query: any): Promise<{ items: Order[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.user_id) where.userId = query.user_id;
    if (query.company_id) where.companyId = query.company_id;
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      this.database.order.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      this.database.order.count({ where }),
    ]);

    return {
      items: orders.map(o => this.mapOrder(o)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getOrderById(id: number): Promise<Order | null> {
    const order = await this.database.order.findUnique({
      where: { id },
      include: { items: true },
    });

    return order ? this.mapOrder(order) : null;
  }

  async createOrder(input: any): Promise<Order> {
    const orderNo = `ORD-${Date.now()}`;

    const order = await this.database.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          channel: input.channel,
          userId: input.user_id,
          companyId: input.company_id,
          currency: input.currency,
          subtotalMinor: input.subtotal_minor,
          taxMinor: input.tax_minor,
          shippingMinor: input.shipping_minor,
          totalMinor: input.total_minor,
          status: input.status,
          addressSnapshot: input.address_snapshot,
          pricingSnapshot: input.pricing_snapshot,
        },
        include: { items: true },
      });

      // Create order items
      if (input.items?.length > 0) {
        await tx.orderItem.createMany({
          data: input.items.map((item: any) => ({
            orderId: created.id,
            variantId: item.variant_id,
            skuSnapshot: item.sku_snapshot,
            nameSnapshot: item.name_snapshot,
            quantity: item.quantity,
            unitPriceMinor: item.unit_price_minor,
            taxMinor: item.tax_minor,
            totalMinor: item.total_minor,
            detailSnapshot: item.detail_snapshot,
          })),
        });
      }

      return created;
    });

    return this.mapOrder(order);
  }

  async findOrderByRequestId(requestId: string): Promise<Order | null> {
    // In a real implementation, you'd have a request_id field on orders
    // For demo, return null
    return null;
  }

  async updateOrderStatus(id: number, status: string, note?: string): Promise<Order> {
    const order = await this.database.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return this.mapOrder(order);
  }

  async reserveInventory(input: { variant_id: number; quantity: number; owner_type: string; owner_id: number; idempotency_key: string; market: string }): Promise<{ id: number }> {
    // Check if reservation already exists (idempotency)
    const existing = await this.database.inventoryReservation.findFirst({
      where: { idempotencyKey: input.idempotency_key },
    });

    if (existing) {
      return { id: existing.id };
    }

    // Find balance
    const balance = await this.database.inventoryBalance.findFirst({
      where: {
        variantId: input.variant_id,
        market: input.market,
      },
    });

    if (!balance || balance.available < input.quantity) {
      throw new Error("Insufficient inventory");
    }

    // Create reservation and update balance in transaction
    const result = await this.database.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.create({
        data: {
          inventoryBalanceId: balance.id,
          ownerType: input.owner_type,
          ownerId: input.owner_id,
          quantity: input.quantity,
          status: "active",
          idempotencyKey: input.idempotency_key,
        },
        select: { id: true },
      });

      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          reserved: { increment: input.quantity },
          available: { decrement: input.quantity },
        },
      });

      return reservation;
    });

    return { id: result.id };
  }

  async releaseInventory(reservationId: number, requestId: string, reason: string): Promise<void> {
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

  async transitionOrder(orderId: number, status: string, requestId: string, note?: string): Promise<Order> {
    const order = await this.database.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        actorId: 1, // TODO: get from context
        action: `order.status.${status}`,
        entity: "order",
        entityId: orderId,
        after: { status },
        requestId,
        ip: null,
      },
    });

    return this.mapOrder(order);
  }

  private mapOrder(order: any): Order {
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
      items: order.items?.map((item: any) => ({
        id: item.id,
        order_id: item.orderId,
        variant_id: item.variantId,
        sku_snapshot: item.skuSnapshot,
        name_snapshot: item.nameSnapshot,
        quantity: item.quantity,
        unit_price_minor: item.unitPriceMinor,
        tax_minor: item.taxMinor,
        total_minor: item.totalMinor,
        detail_snapshot: item.detailSnapshot,
      })) || [],
      request_id: order.requestId,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }
}
