import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  Cart,
  CartItem,
  CartItemUpsertInput,
  CartListQuery,
  CommerceChannel,
  InventoryBalance,
  InventoryBalanceListQuery,
  InventoryReservation,
  InventoryReservationCreateInput,
  InventoryReservationListQuery,
  Order,
  OrderItem,
  OrderListQuery,
  OrderStatus,
  Payment,
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentListQuery,
  PaymentStatus,
  PricingPreviewItem,
  PricingPreviewRequest,
  PricingRecord,
  PricingRecordListQuery,
  Quote,
  QuoteCreateInput,
  QuoteListQuery,
  QuoteVersion,
  ReturnCreateInput,
  ReturnListQuery,
  ReturnRequest,
  ReturnStatus,
} from "@wemo/contracts/commerce";
import type { JsonValue } from "@wemo/contracts/common";

import { DATABASE_CLIENT } from "../database/database.constants";

/**
 * Commerce persistence boundary.
 *
 * Every method in this class reads or writes the normalized Prisma entities.
 * The API contract has a richer aggregate shape than the tables, so mapping
 * and hydration happen at this boundary; no in-memory aggregate is retained
 * between requests.
 */
@Injectable()
export class CommerceRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  private asJson(value: unknown): any {
    return value as any;
  }

  private iso(value: Date | string | null | undefined): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return new Date(value).toISOString();
    return new Date().toISOString();
  }

  private nullableIso(value: Date | string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return this.iso(value);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }

  private page<T>(items: T[], total: number, page = 1, pageSize = 20) {
    return { items, page, page_size: pageSize, total };
  }

  private mapPrice(row: any): PricingRecord {
    return {
      id: row.id,
      variant_id: row.variantId,
      price_list_id: row.priceListId,
      dealer_tier_id: row.dealerTierId,
      dealer_company_id: row.dealerCompanyId,
      market: row.market,
      currency: row.currency,
      price_type: row.priceType,
      amount_minor: row.amountMinor,
      min_quantity: row.minQuantity,
      rules: this.asJson(row.rules),
      valid_from: this.nullableIso(row.validFrom),
      valid_to: this.nullableIso(row.validTo),
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt ?? row.createdAt),
    };
  }

  private mapBalance(row: any): InventoryBalance {
    return {
      id: row.id,
      variant_id: row.variantId,
      warehouse_code: row.warehouseCode,
      market: row.market,
      on_hand: row.onHand,
      available: row.available,
      reserved: row.reserved,
      source: row.source,
      synced_at: this.iso(row.syncedAt ?? row.updatedAt),
      updated_at: this.iso(row.updatedAt),
    };
  }

  private mapReservation(row: any, balance?: any): InventoryReservation {
    return {
      id: row.id,
      inventory_balance_id: row.inventoryBalanceId,
      owner_type: row.ownerType,
      owner_id: row.ownerId,
      quantity: row.quantity,
      status: row.status,
      expires_at: this.nullableIso(row.expiresAt),
      idempotency_key:
        row.idempotencyKey ?? `${row.ownerType}:${row.ownerId}:${row.id}`,
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt ?? row.createdAt),
      ...(balance
        ? {
            variant_id: balance.variantId,
            warehouse_code: balance.warehouseCode,
            market: balance.market,
          }
        : {}),
    } as InventoryReservation;
  }

  private mapCartItem(row: any): CartItem {
    return {
      id: row.id,
      variant_id: row.variantId,
      quantity: row.quantity,
      unit_price_minor: row.unitPriceMinor,
      line_total_minor: row.unitPriceMinor * row.quantity,
      currency: row.currency,
      snapshot: this.asJson(row.snapshot),
      added_at: this.iso(row.addedAt ?? row.updatedAt),
      updated_at: this.iso(row.updatedAt ?? row.addedAt),
    };
  }

  private mapCart(row: any, itemRows: any[]): Cart {
    const items = itemRows.map((item) => this.mapCartItem(item));
    const subtotal = items.reduce((sum, item) => sum + item.line_total_minor, 0);
    return {
      id: row.id,
      user_id: row.userId,
      company_id: row.companyId,
      channel: row.channel,
      market: row.market,
      currency: row.currency,
      status: row.status,
      items,
      subtotal_minor: subtotal,
      total_minor: subtotal,
      updated_at: this.iso(row.updatedAt),
      expires_at: this.nullableIso(row.expiresAt),
      created_at: this.iso(row.createdAt ?? row.updatedAt),
    };
  }

  private mapOrderItem(row: any): OrderItem {
    return {
      id: row.id,
      variant_id: row.variantId,
      sku_snapshot: row.skuSnapshot,
      name_snapshot: row.nameSnapshot,
      quantity: row.quantity,
      unit_price_minor: row.unitPriceMinor,
      tax_minor: row.taxMinor,
      shipping_minor: row.shippingMinor ?? 0,
      total_minor: row.totalMinor,
      detail_snapshot: this.asJson(row.detailSnapshot),
    };
  }

  private mapOrder(row: any, itemRows: any[], historyRows: any[] = []): Order {
    const history = historyRows.map((item) => ({ status: item.toStatus, request_id: item.requestId, note: item.reason, created_at: this.iso(item.createdAt) }));
    return {
      id: row.id,
      order_no: row.orderNo,
      channel: row.channel,
      user_id: row.userId,
      company_id: row.companyId,
      currency: row.currency,
      subtotal_minor: row.subtotalMinor,
      tax_minor: row.taxMinor,
      shipping_minor: row.shippingMinor,
      total_minor: row.totalMinor,
      status: row.status,
      address_snapshot: this.asJson(row.addressSnapshot),
      pricing_snapshot: this.asJson(row.pricingSnapshot),
      items: itemRows.map((item) => this.mapOrderItem(item)),
      status_history: history as Order["status_history"],
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt),
    };
  }

  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      order_id: row.orderId,
      provider: row.provider,
      provider_txn_id: row.providerTxnId,
      status: row.status,
      amount_minor: row.amountMinor,
      currency: row.currency,
      failure_reason: row.failureReason,
      idempotency_key: row.idempotencyKey,
      refunded_minor: row.refundedMinor ?? 0,
      payload: this.asJson(row.payload ?? {}),
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt),
    };
  }

  private mapReturn(row: any, historyRows: any[] = []): ReturnRequest {
    const history = historyRows.map((item) => ({ status: item.toStatus, note: item.reason ?? null, request_id: item.requestId ?? "db", created_at: this.iso(item.createdAt) }));
    return {
      id: row.id,
      order_id: row.orderId,
      user_id: row.userId,
      company_id: row.companyId,
      status: row.status,
      reason: row.reason,
      items: Array.isArray(row.items) ? row.items : [],
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      history: history as ReturnRequest["history"],
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt),
       refunded_at: null,
    };
  }

  private mapQuote(row: any, versions: any[]): Quote {
    return {
      id: row.id,
      quote_no: row.quoteNo,
      company_id: row.companyId,
       requested_by_user_id: row.requesterId ?? null,
      current_version: row.currentVersion,
      status: row.status,
      valid_until: this.iso(row.validUntil),
      converted_order_id: row.convertedOrderId,
      pricing_snapshot: this.asJson(row.pricingSnapshot ?? {}),
      terms_snapshot: this.asJson(row.termsSnapshot ?? {}),
       items: [],
      versions: versions.map((version) => this.mapQuoteVersion(version)),
      created_at: this.iso(row.createdAt),
      updated_at: this.iso(row.updatedAt ?? row.createdAt),
    };
  }

  private mapQuoteVersion(row: any): QuoteVersion {
    return {
      id: row.id,
      quote_id: row.quoteId,
      version: row.version,
       snapshot: this.asJson(row.snapshot) as QuoteVersion["snapshot"],
      created_by: row.createdBy,
      created_at: this.iso(row.createdAt),
    };
  }

  private async hydrateCart(row: any): Promise<Cart> {
    const items = await this.database.cartItem.findMany({
      where: { cartId: row.id },
      orderBy: { id: "asc" },
    });
    return this.mapCart(row, items);
  }

  private async hydrateOrder(row: any, db: any = this.database): Promise<Order> {
    const items = await db.orderItem.findMany({
      where: { orderId: row.id },
      orderBy: { id: "asc" },
    });
    const history = await db.orderStatusHistory.findMany({ where: { orderId: row.id }, orderBy: { createdAt: "asc" } });
    return this.mapOrder(row, items, history);
  }

  private async hydrateQuote(row: any, db: any = this.database): Promise<Quote> {
    const versions = await db.quoteVersion.findMany({
      where: { quoteId: row.id },
      orderBy: { version: "asc" },
    });
    return this.mapQuote(row, versions);
  }

  private async variantSnapshot(variantId: number): Promise<JsonValue> {
    const variant = await this.database.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException("商品变体不存在");
    const product = await this.database.product.findUnique({
      where: { id: variant.productId },
    });
    if (!product) throw new NotFoundException("商品不存在");
    const translation = await this.database.productTranslation.findFirst({
      where: { productId: product.id },
      orderBy: { id: "asc" },
    });
    return {
      variant_id: variant.id,
      product_id: product.id,
      product_slug: translation?.slug ?? `product-${product.id}`,
      product_name: translation?.name ?? `Product ${product.id}`,
      sku: variant.sku,
      options: this.asJson(variant.options),
      specifications: this.asJson(variant.specifications),
      primary_image_url: null,
    };
  }

  async getPricingRecordById(id: number): Promise<PricingRecord> {
    const row = await this.database.price.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("价格记录不存在");
    return this.mapPrice(row);
  }

  async listPricingRecords(query: PricingRecordListQuery) {
    const where: any = {};
    if (query.variant_id !== undefined) where.variantId = query.variant_id;
    if (query.market !== undefined) where.market = query.market;
    if (query.currency !== undefined) where.currency = query.currency;
    if (query.price_type !== undefined) where.priceType = query.price_type;
    const [rows, total] = await Promise.all([
      this.database.price.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.price.count({ where }),
    ]);
    return this.page(rows.map((row) => this.mapPrice(row)), total, query.page, query.page_size);
  }

  private priceRank(record: PricingRecord, context: { dealer_company_id?: number | undefined; dealer_tier_id?: number | undefined; price_list_id?: number | undefined }): number {
    if (record.dealer_company_id && record.dealer_company_id === context.dealer_company_id) return 0;
    if (record.price_list_id && record.price_list_id === context.price_list_id) return 1;
    if (record.dealer_tier_id && record.dealer_tier_id === context.dealer_tier_id) return 2;
    if (record.price_type === "promo") return 3;
    if (record.price_type === "msrp") return 4;
    if (record.price_type === "default_b2b") return 5;
    if (record.price_type === "dealer_tier") return 6;
    if (record.price_type === "price_list") return 7;
    if (record.price_type === "dealer_company") return 8;
    return 9;
  }

  private async selectPrice(variantId: number, quantity: number, input: PricingPreviewRequest): Promise<PricingRecord | null> {
    const market = input.market ?? "global";
    const currency = input.currency ?? "USD";
    const rows = await this.database.price.findMany({
      where: { variantId, market, currency },
      orderBy: [{ minQuantity: "desc" }, { id: "asc" }],
    });
    const now = Date.now();
    const eligible = rows.filter((row) => {
      if (row.minQuantity > quantity) return false;
      if (row.validFrom && row.validFrom.getTime() > now) return false;
      if (row.validTo && row.validTo.getTime() < now) return false;
      if (row.dealerCompanyId && input.dealer_company_id !== row.dealerCompanyId) return false;
      if (row.dealerTierId && input.dealer_tier_id !== row.dealerTierId) return false;
      if (row.priceListId && input.price_list_id !== row.priceListId) return false;
      return true;
    });
    const candidates = eligible.length > 0 ? eligible : rows.filter((row) => row.minQuantity <= quantity);
    candidates.sort((left, right) => {
      const rank = this.priceRank(this.mapPrice(left), input) - this.priceRank(this.mapPrice(right), input);
      return rank !== 0 ? rank : right.minQuantity - left.minQuantity;
    });
    return candidates[0] ? this.mapPrice(candidates[0]) : null;
  }

  async previewPricing(input: PricingPreviewRequest) {
    const currency = input.currency ?? "USD";
    const items: PricingPreviewItem[] = [];
    let subtotal_minor = 0;
    for (const line of input.items) {
      const record = await this.selectPrice(line.variant_id, line.quantity, input);
      if (!record) throw new NotFoundException("价格不存在");
      const snapshot = await this.variantSnapshot(line.variant_id);
      const lineTotal = record.amount_minor * line.quantity;
      subtotal_minor += lineTotal;
      items.push({
        variant_id: line.variant_id,
        quantity: line.quantity,
        currency: record.currency,
        price_type: record.price_type,
        price_record_id: record.id,
        dealer_company_id: record.dealer_company_id,
        dealer_tier_id: record.dealer_tier_id,
        price_list_id: record.price_list_id,
        unit_price_minor: record.amount_minor,
        line_total_minor: lineTotal,
        min_quantity: record.min_quantity,
        valid_from: record.valid_from,
        valid_to: record.valid_to,
        snapshot: this.asJson({ variant: snapshot, pricing_record: record }),
      });
    }
    return { currency, subtotal_minor, source: items[0]?.price_type ?? "msrp", items };
  }

  async upsertPricingRecord(input: Partial<PricingRecord> & {
    variant_id: number;
    market: string;
    currency: string;
    price_type: string;
    amount_minor: number;
    min_quantity?: number;
    rules?: JsonValue;
    valid_from?: string | null;
    valid_to?: string | null;
    id?: number;
  }): Promise<PricingRecord> {
    if (input.id !== undefined) {
      const current = await this.database.price.findUnique({ where: { id: input.id } });
      if (!current) throw new NotFoundException("价格记录不存在");
      const row = await this.database.price.update({
        where: { id: input.id },
        data: {
          variantId: input.variant_id,
          priceListId: input.price_list_id ?? current.priceListId,
          dealerTierId: input.dealer_tier_id ?? current.dealerTierId,
          dealerCompanyId: input.dealer_company_id ?? current.dealerCompanyId,
          market: input.market,
          currency: input.currency,
          priceType: input.price_type,
          amountMinor: input.amount_minor,
          minQuantity: input.min_quantity ?? current.minQuantity,
          rules: this.asJson(input.rules ?? current.rules),
          validFrom: input.valid_from === undefined ? current.validFrom : input.valid_from ? new Date(input.valid_from) : null,
          validTo: input.valid_to === undefined ? current.validTo : input.valid_to ? new Date(input.valid_to) : null,
        },
      });
      return this.mapPrice(row);
    }
    const row = await this.database.price.create({
      data: {
        variantId: input.variant_id,
        priceListId: input.price_list_id ?? null,
        dealerTierId: input.dealer_tier_id ?? null,
        dealerCompanyId: input.dealer_company_id ?? null,
        market: input.market,
        currency: input.currency,
        priceType: input.price_type,
        amountMinor: input.amount_minor,
        minQuantity: input.min_quantity ?? 1,
        rules: this.asJson(input.rules ?? {}),
        validFrom: input.valid_from ? new Date(input.valid_from) : null,
        validTo: input.valid_to ? new Date(input.valid_to) : null,
      },
    });
    return this.mapPrice(row);
  }

  async getInventoryBalanceById(id: number): Promise<InventoryBalance> {
    const row = await this.database.inventoryBalance.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("库存不存在");
    return this.mapBalance(row);
  }

  async listInventoryBalances(query: InventoryBalanceListQuery) {
    const where: any = {};
    if (query.variant_id !== undefined) where.variantId = query.variant_id;
    if (query.market !== undefined) where.market = query.market;
    if (query.warehouse_code !== undefined) where.warehouseCode = query.warehouse_code;
    const [rows, total] = await Promise.all([
      this.database.inventoryBalance.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.inventoryBalance.count({ where }),
    ]);
    return this.page(rows.map((row) => this.mapBalance(row)), total, query.page, query.page_size);
  }

  async getInventoryReservationById(id: number): Promise<InventoryReservation> {
    const row = await this.database.inventoryReservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("库存预占不存在");
    const balance = await this.database.inventoryBalance.findUnique({ where: { id: row.inventoryBalanceId } });
    return this.mapReservation(row, balance);
  }

  async listInventoryReservations(query: InventoryReservationListQuery) {
    const where: any = {};
    if (query.inventory_balance_id !== undefined) where.inventoryBalanceId = query.inventory_balance_id;
    if (query.owner_type !== undefined) where.ownerType = query.owner_type;
    if (query.owner_id !== undefined) where.ownerId = query.owner_id;
    if (query.status !== undefined) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.database.inventoryReservation.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.inventoryReservation.count({ where }),
    ]);
    const balanceIds = [...new Set(rows.map((row) => row.inventoryBalanceId))];
    const balances = await this.database.inventoryBalance.findMany({ where: { id: { in: balanceIds } } });
    const byId = new Map(balances.map((balance) => [balance.id, balance]));
    return this.page(rows.map((row) => this.mapReservation(row, byId.get(row.inventoryBalanceId))), total, query.page, query.page_size);
  }

  async reserveInventory(input: InventoryReservationCreateInput, _requestId: string): Promise<InventoryReservation> {
    const warehouseCode = input.warehouse_code ?? "WH-US-1";
    const market = input.market ?? "global";
    try {
      return await this.database.$transaction(async (tx: any) => {
        const existing = await tx.inventoryReservation.findUnique({ where: { idempotencyKey: input.idempotency_key } });
        if (existing) {
          const balance = await tx.inventoryBalance.findUnique({ where: { id: existing.inventoryBalanceId } });
          return this.mapReservation(existing, balance);
        }
        const balance = await tx.inventoryBalance.findUnique({ where: { variantId_warehouseCode_market: { variantId: input.variant_id, warehouseCode, market } } });
        if (!balance) throw new NotFoundException("库存不存在");
        const changed = await tx.inventoryBalance.updateMany({ where: { id: balance.id, available: { gte: input.quantity } }, data: { available: { decrement: input.quantity }, reserved: { increment: input.quantity } } });
        if (changed.count !== 1) throw new ConflictException("库存不足");
        const reservation = await tx.inventoryReservation.create({ data: { inventoryBalanceId: balance.id, ownerType: input.owner_type, ownerId: input.owner_id, quantity: input.quantity, status: "active", expiresAt: input.expires_at ? new Date(input.expires_at) : null, idempotencyKey: input.idempotency_key } });
        return this.mapReservation(reservation, balance);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.database.inventoryReservation.findUnique({ where: { idempotencyKey: input.idempotency_key } });
        if (existing) return this.getInventoryReservationById(existing.id);
      }
      throw error;
    }
  }

  async confirmInventoryReservation(id: number, _requestId: string): Promise<InventoryReservation> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.inventoryReservation.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("库存预占不存在");
      if (current.status !== "active") {
        const balance = await tx.inventoryBalance.findUnique({ where: { id: current.inventoryBalanceId } });
        return this.mapReservation(current, balance);
      }
      const changed = await tx.inventoryReservation.updateMany({ where: { id, status: "active" }, data: { status: "confirmed" } });
      if (changed.count === 1) await tx.inventoryBalance.updateMany({ where: { id: current.inventoryBalanceId, reserved: { gte: current.quantity } }, data: { reserved: { decrement: current.quantity } } });
      const saved = await tx.inventoryReservation.findUnique({ where: { id } });
      const balance = await tx.inventoryBalance.findUnique({ where: { id: current.inventoryBalanceId } });
      return this.mapReservation(saved, balance);
    });
  }

  async releaseInventory(id: number, _requestId: string, _reason?: string): Promise<InventoryReservation> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.inventoryReservation.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("库存预占不存在");
      if (current.status !== "active") {
        const balance = await tx.inventoryBalance.findUnique({ where: { id: current.inventoryBalanceId } });
        return this.mapReservation(current, balance);
      }
      const changed = await tx.inventoryReservation.updateMany({ where: { id, status: "active" }, data: { status: "released" } });
      if (changed.count === 1) await tx.inventoryBalance.updateMany({ where: { id: current.inventoryBalanceId }, data: { reserved: { decrement: current.quantity }, available: { increment: current.quantity } } });
      const saved = await tx.inventoryReservation.findUnique({ where: { id } });
      const balance = await tx.inventoryBalance.findUnique({ where: { id: current.inventoryBalanceId } });
      return this.mapReservation(saved, balance);
    });
  }

  async getCartById(id: number): Promise<Cart> {
    const row = await this.database.cart.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("购物车不存在");
    return this.hydrateCart(row);
  }

  async listCarts(query: CartListQuery) {
    const where: any = {};
    if (query.user_id !== undefined) where.userId = query.user_id;
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.status !== undefined) where.status = query.status;
    if (query.channel !== undefined) where.channel = query.channel;
    const [rows, total] = await Promise.all([
      this.database.cart.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.cart.count({ where }),
    ]);
    const items = await Promise.all(rows.map((row) => this.hydrateCart(row)));
    return this.page(items, total, query.page, query.page_size);
  }

  async createCart(input: { user_id: number | null; company_id: number | null; channel: CommerceChannel; market: string; currency: string }): Promise<Cart> {
    const row = await this.database.cart.create({ data: { userId: input.user_id, companyId: input.company_id, channel: input.channel, market: input.market, currency: input.currency, status: "active" } });
    return this.mapCart(row, []);
  }

  async getOrCreateCart(input: { user_id: number | null; company_id: number | null; channel: CommerceChannel; market: string; currency: string }): Promise<Cart> {
    const where: any = { userId: input.user_id, companyId: input.company_id, channel: input.channel, market: input.market, currency: input.currency, status: "active" };
    const existing = await this.database.cart.findFirst({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
    if (existing) return this.hydrateCart(existing);
    try {
      return await this.createCart(input);
    } catch (error) {
      const concurrent = await this.database.cart.findFirst({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
      if (concurrent) return this.hydrateCart(concurrent);
      throw error;
    }
  }

  async upsertCartItem(cartId: number, input: CartItemUpsertInput & { unit_price_minor: number; currency: string; snapshot: JsonValue }): Promise<Cart> {
    const row = await this.database.cart.findUnique({ where: { id: cartId } });
    if (!row) throw new NotFoundException("购物车不存在");
    await this.database.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: input.variant_id } },
      create: { cartId, variantId: input.variant_id, quantity: input.quantity, unitPriceMinor: input.unit_price_minor, currency: input.currency, snapshot: this.asJson(input.snapshot) },
      update: { quantity: input.quantity, unitPriceMinor: input.unit_price_minor, currency: input.currency, snapshot: this.asJson(input.snapshot) },
    });
    return this.getCartById(cartId);
  }

  async mergeCart(sourceCartId: number, targetCartId?: number): Promise<Cart> {
    if (targetCartId === undefined || targetCartId === sourceCartId) return this.getCartById(sourceCartId);
    return this.database.$transaction(async (tx: any) => {
      const source = await tx.cart.findUnique({ where: { id: sourceCartId } });
      const target = await tx.cart.findUnique({ where: { id: targetCartId } });
      if (!source || !target) throw new NotFoundException("购物车不存在");
      const sourceItems = await tx.cartItem.findMany({ where: { cartId: sourceCartId }, orderBy: { id: "asc" } });
      for (const item of sourceItems) {
        const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: targetCartId, variantId: item.variantId } } });
        if (existing) await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity, unitPriceMinor: item.unitPriceMinor, currency: item.currency, snapshot: item.snapshot } });
        else await tx.cartItem.create({ data: { cartId: targetCartId, variantId: item.variantId, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, currency: item.currency, snapshot: item.snapshot } });
      }
      await tx.cart.update({ where: { id: sourceCartId }, data: { status: "converted" } });
      const savedTarget = await tx.cart.findUnique({ where: { id: targetCartId } });
      const targetItems = await tx.cartItem.findMany({ where: { cartId: targetCartId }, orderBy: { id: "asc" } });
      return this.mapCart(savedTarget, targetItems);
    });
  }

  async listOrders(query: OrderListQuery) {
    const where: any = {};
    if (query.channel !== undefined) where.channel = query.channel;
    if (query.status !== undefined) where.status = query.status;
    if (query.user_id !== undefined) where.userId = query.user_id;
    if (query.company_id !== undefined) where.companyId = query.company_id;
    const [rows, total] = await Promise.all([
      this.database.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.order.count({ where }),
    ]);
    const items = await Promise.all(rows.map((row) => this.hydrateOrder(row)));
    return this.page(items, total, query.page, query.page_size);
  }

  async getOrderById(id: number): Promise<Order> {
    const row = await this.database.order.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("订单不存在");
    return this.hydrateOrder(row);
  }

  async findOrderByRequestId(requestId: string): Promise<Order | null> {
    const row = await this.database.order.findFirst({ where: { requestId } });
    return row ? this.hydrateOrder(row) : null;
  }

  async createOrder(input: {
    channel: Order["channel"];
    user_id: number | null;
    company_id: number | null;
    currency: string;
    subtotal_minor: number;
    tax_minor: number;
    shipping_minor: number;
    total_minor: number;
    status: OrderStatus;
    address_snapshot: JsonValue;
    pricing_snapshot: JsonValue;
    items: OrderItem[];
    request_id: string;
    note?: string | null;
  }): Promise<Order> {
    const existing = await this.findOrderByRequestId(input.request_id);
    if (existing) return existing;
    const orderNo = `SO-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const history = [{ status: input.status, request_id: input.request_id, note: input.note ?? null, created_at: new Date().toISOString() }];
    try {
      return await this.database.$transaction(async (tx: any) => {
        const row = await tx.order.create({ data: { orderNo, requestId: input.request_id, channel: input.channel, userId: input.user_id, companyId: input.company_id, currency: input.currency, subtotalMinor: input.subtotal_minor, taxMinor: input.tax_minor, shippingMinor: input.shipping_minor, totalMinor: input.total_minor, status: input.status, addressSnapshot: this.asJson(input.address_snapshot), pricingSnapshot: this.asJson(input.pricing_snapshot) } });
        await tx.orderStatusHistory.create({ data: { orderId: row.id, toStatus: input.status, reason: input.note ?? null, requestId: input.request_id } });
        for (const item of input.items) await tx.orderItem.create({ data: { orderId: row.id, variantId: item.variant_id, skuSnapshot: item.sku_snapshot, nameSnapshot: item.name_snapshot, quantity: item.quantity, unitPriceMinor: item.unit_price_minor, taxMinor: item.tax_minor, shippingMinor: item.shipping_minor, totalMinor: item.total_minor, detailSnapshot: this.asJson(item.detail_snapshot) } });
        const saved = await tx.order.findUnique({ where: { id: row.id } });
        return this.hydrateOrder(saved, tx);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.findOrderByRequestId(input.request_id);
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async transitionOrder(id: number, nextStatus: OrderStatus, requestId: string, note?: string): Promise<Order> {
    const allowed: Record<string, string[]> = { pending_payment: ["paid", "cancelled"], paid: ["processing", "completed", "cancelled", "refunded"], processing: ["partially_shipped", "shipped", "completed", "cancelled"], partially_shipped: ["shipped", "completed"], shipped: ["completed"], completed: [], cancelled: [], refunded: [], pending_review: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled", "completed"], awaiting_payment: ["confirmed", "cancelled", "paid"] };
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("订单不存在");
      if (current.status === nextStatus) return this.hydrateOrder(current, tx);
      if (!(allowed[current.status] ?? []).includes(nextStatus)) throw new ConflictException("订单状态不允许转换");
      const saved = await tx.order.update({ where: { id }, data: { status: nextStatus } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: current.status, toStatus: nextStatus, reason: note ?? null, requestId } });
      return this.hydrateOrder(saved, tx);
    });
  }

  async listPayments(query: PaymentListQuery) {
    const where: any = {};
    if (query.order_id !== undefined) where.orderId = query.order_id;
    if (query.provider !== undefined) where.provider = query.provider;
    if (query.status !== undefined) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.database.payment.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.payment.count({ where }),
    ]);
    return this.page(rows.map((row) => this.mapPayment(row)), total, query.page, query.page_size);
  }

  async getPaymentById(id: number): Promise<Payment> {
    const row = await this.database.payment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("支付记录不存在");
    return this.mapPayment(row);
  }

  async createPayment(input: PaymentCreateInput & { request_id: string; provider_txn_id?: string | null; status?: PaymentStatus; currency?: string }): Promise<Payment> {
    const existing = await this.database.payment.findUnique({ where: { idempotencyKey: input.idempotency_key } });
    if (existing) return this.mapPayment(existing);
    const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload) ? input.payload as Record<string, unknown> : {};
    try {
      const row = await this.database.payment.create({ data: { orderId: input.order_id, provider: input.provider, providerTxnId: input.provider_txn_id ?? null, status: input.status ?? "pending", amountMinor: input.amount_minor ?? 0, currency: input.currency ?? (typeof payload.currency === "string" ? payload.currency : "USD"), failureReason: null, idempotencyKey: input.idempotency_key, refundedMinor: 0, payload: this.asJson(payload) } });
      return this.mapPayment(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.database.payment.findUnique({ where: { idempotencyKey: input.idempotency_key } });
        if (concurrent) return this.mapPayment(concurrent);
      }
      throw error;
    }
  }

  async capturePayment(id: number, _requestId: string, input: PaymentCaptureInput): Promise<Payment> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.payment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("支付记录不存在");
      if (current.status === "paid") return this.mapPayment(current);
      const existingPayload = current.payload && typeof current.payload === "object" && !Array.isArray(current.payload) ? current.payload : {};
      const payload = input.payload ?? existingPayload;
      const saved = await tx.payment.update({ where: { id }, data: { status: "paid", providerTxnId: input.provider_txn_id ?? current.providerTxnId, amountMinor: input.amount_minor ?? current.amountMinor, payload: this.asJson(payload), failureReason: null } });
      return this.mapPayment(saved);
    });
  }

  async refundPayment(id: number, _requestId: string, input: { amount_minor?: number; reason?: string }): Promise<Payment> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.payment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("支付记录不存在");
      const available = current.amountMinor - (current.refundedMinor ?? 0);
      const amount = input.amount_minor ?? available;
      if (amount <= 0 || amount > available) throw new ConflictException("退款金额超过可退余额");
      const refunded = (current.refundedMinor ?? 0) + amount;
      const saved = await tx.payment.update({ where: { id }, data: { refundedMinor: refunded, status: refunded >= current.amountMinor ? "refunded" : "partially_refunded", failureReason: input.reason ?? current.failureReason } });
      return this.mapPayment(saved);
    });
  }

  async listReturnRequests(query: ReturnListQuery) {
    const where: any = {};
    if (query.order_id !== undefined) where.orderId = query.order_id;
    if (query.user_id !== undefined) where.userId = query.user_id;
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.status !== undefined) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.database.returnRequest.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.returnRequest.count({ where }),
    ]);
    return this.page(rows.map((row) => this.mapReturn(row)), total, query.page, query.page_size);
  }

  async getReturnRequestById(id: number): Promise<ReturnRequest> {
    const row = await this.database.returnRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("售后单不存在");
    return this.mapReturn(row);
  }

  async createReturnRequest(input: ReturnCreateInput & { user_id: number | null; company_id: number | null; request_id: string }): Promise<ReturnRequest> {
    const existing = await this.database.returnRequest.findFirst({ where: { returnNo: input.request_id } });
    if (existing) return this.mapReturn(existing);
    try {
      const row = await this.database.returnRequest.create({ data: { returnNo: input.request_id, orderId: input.order_id, userId: input.user_id, companyId: input.company_id, status: "requested", reason: input.reason, items: this.asJson(input.items), attachments: this.asJson(input.attachments) } });
      return this.mapReturn(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.database.returnRequest.findFirst({ where: { returnNo: input.request_id } });
        if (concurrent) return this.mapReturn(concurrent);
      }
      throw error;
    }
  }

  async reviewReturnRequest(id: number, requestId: string, decision: ReturnStatus, note?: string): Promise<ReturnRequest> {
    const allowed: Record<string, string[]> = { requested: ["approved", "rejected"], approved: ["in_transit", "received", "refunded", "closed"], rejected: [], in_transit: ["received", "refunded", "closed"], received: ["refunded", "closed"], refunded: ["closed"], closed: [] };
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.returnRequest.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("售后单不存在");
      if (current.status === decision) return this.mapReturn(current);
      if (!(allowed[current.status] ?? []).includes(decision)) throw new ConflictException("售后状态不允许转换");
      const row = await tx.returnRequest.update({ where: { id }, data: { status: decision, reviewNote: note ?? null, approvedAt: decision === "approved" ? new Date() : undefined, completedAt: decision === "closed" ? new Date() : undefined } });
      await tx.returnStatusHistory.create({ data: { returnRequestId: id, fromStatus: current.status, toStatus: decision, reason: note ?? null } });
      const history = await tx.returnStatusHistory.findMany({ where: { returnRequestId: id }, orderBy: { createdAt: "asc" } });
      return this.mapReturn(row, history);
    });
  }

  async listQuotes(query: QuoteListQuery) {
    const where: any = {};
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.status !== undefined) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.database.quote.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.page_size, take: query.page_size }),
      this.database.quote.count({ where }),
    ]);
    const items = await Promise.all(rows.map((row) => this.hydrateQuote(row)));
    return this.page(items, total, query.page, query.page_size);
  }

  async getQuoteById(id: number): Promise<Quote> {
    const row = await this.database.quote.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("报价不存在");
    return this.hydrateQuote(row);
  }

  async findQuoteByRequestId(requestId: string): Promise<Quote | null> {
    const row = await this.database.quote.findUnique({ where: { idempotencyKey: requestId } });
    return row ? this.hydrateQuote(row) : null;
  }

  async listQuoteVersions(quoteId: number) {
    const [rows, total] = await Promise.all([
      this.database.quoteVersion.findMany({ where: { quoteId }, orderBy: [{ version: "desc" }, { id: "desc" }] }),
      this.database.quoteVersion.count({ where: { quoteId } }),
    ]);
    return this.page(rows.slice(0, 20).map((row) => this.mapQuoteVersion(row)), total, 1, 20);
  }

  async createQuote(input: QuoteCreateInput & { company_id: number; requested_by_user_id: number | null; request_id: string }): Promise<Quote> {
    const existing = await this.findQuoteByRequestId(input.request_id);
    if (existing) return existing;
    const validUntil = new Date(Date.now() + input.valid_days * 24 * 60 * 60 * 1000);
    const quoteNo = `Q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      return await this.database.$transaction(async (tx: any) => {
        const row = await tx.quote.create({ data: { quoteNo, idempotencyKey: input.request_id, companyId: input.company_id, requesterId: input.requested_by_user_id, currentVersion: 1, version: 1, status: "requested", currency: "USD", validUntil, pricingSnapshot: this.asJson(input.pricing_snapshot), termsSnapshot: this.asJson(input.terms_snapshot) } });
        const version = await tx.quoteVersion.create({ data: { quoteId: row.id, version: 1, status: "requested", currency: "USD", validUntil, termsSnapshot: this.asJson(input.terms_snapshot), snapshot: { items: input.items, pricing_snapshot: input.pricing_snapshot, terms_snapshot: input.terms_snapshot, status: "requested", valid_until: validUntil.toISOString(), note: input.note ?? null }, createdBy: input.requested_by_user_id ?? 1 } });
        for (const item of input.items) await tx.quoteItem.create({ data: { quoteId: row.id, quoteVersionId: version.id, variantId: item.variant_id, skuSnapshot: `variant-${item.variant_id}`, nameSnapshot: `Variant ${item.variant_id}`, quantity: item.quantity, unitPriceMinor: 0, totalMinor: 0, detailSnapshot: this.asJson(item) } });
        const saved = await tx.quote.findUnique({ where: { id: row.id } });
        return this.hydrateQuote(saved, tx);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.findQuoteByRequestId(input.request_id);
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async reviewQuote(id: number, _requestId: string, input: { decision: "under_review" | "quoted" | "rejected" | "expired"; note?: string; terms_snapshot?: JsonValue }): Promise<Quote> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.quote.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("报价不存在");
      const nextVersion = current.currentVersion + 1;
      const terms = input.terms_snapshot ?? current.termsSnapshot;
      const row = await tx.quote.update({ where: { id }, data: { status: input.decision, currentVersion: nextVersion, termsSnapshot: this.asJson(terms) } });
       await tx.quoteVersion.create({ data: { quoteId: id, version: nextVersion, status: input.decision, currency: current.currency, validUntil: current.validUntil, termsSnapshot: this.asJson(terms), snapshot: { items: [], pricing_snapshot: current.pricingSnapshot, terms_snapshot: terms, status: input.decision, valid_until: this.iso(current.validUntil), note: input.note ?? null }, createdBy: current.requesterId ?? 1 } });
      return this.hydrateQuote(row, tx);
    });
  }

  async convertQuote(id: number, _requestId: string, input: { order_channel: CommerceChannel; accepted_version?: number; note?: string; converted_order_id?: number | null }): Promise<Quote> {
    return this.database.$transaction(async (tx: any) => {
      const current = await tx.quote.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("报价不存在");
      if (!["quoted", "accepted"].includes(current.status)) throw new ConflictException("报价不能转单");
      if (input.accepted_version !== undefined && input.accepted_version > current.currentVersion) throw new ConflictException("报价版本不存在");
      const row = await tx.quote.update({ where: { id }, data: { status: "converted", convertedOrderId: input.converted_order_id ?? current.convertedOrderId } });
      return this.hydrateQuote(row, tx);
    });
  }
}
