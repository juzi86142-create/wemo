import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Cart,
  CartItem,
  CartItemUpsertInput,
  CartListQuery,
  CartStatus,
  CommerceChannel,
  InventoryBalance,
  InventoryBalanceListQuery,
  InventoryReservation,
  InventoryReservationCreateInput,
  InventoryReservationListQuery,
  InventoryReservationStatus,
  Order,
  OrderCreateInput,
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

import { ExperienceStateStore } from "./experience.state";

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map((item) => clone(item)),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type OrderHistoryEntry = {
  status: OrderStatus;
  request_id: string;
  note: string | null;
  created_at: string;
};

function orderStatusHistory(
  status: OrderStatus,
  request_id: string,
  note: string | null = null,
): OrderHistoryEntry {
  return {
    status,
    request_id,
    note,
    created_at: nowIso(),
  };
}

@Injectable()
export class CommerceStateStore {
  private pricingSeq = 1;
  private inventoryBalanceSeq = 1;
  private inventoryReservationSeq = 1;
  private cartSeq = 1;
  private cartItemSeq = 1;
  private orderSeq = 1;
  private orderItemSeq = 1;
  private paymentSeq = 1;
  private returnSeq = 1;
  private quoteSeq = 1;
  private quoteVersionSeq = 1;

  private readonly pricingRecords: PricingRecord[] = [];
  private readonly inventoryBalances: InventoryBalance[] = [];
  private readonly inventoryReservations: InventoryReservation[] = [];
  private readonly carts: Cart[] = [];
  private readonly orders: Order[] = [];
  private readonly payments: Payment[] = [];
  private readonly returnRequests: ReturnRequest[] = [];
  private readonly quotes: Quote[] = [];
  private readonly quoteVersions: QuoteVersion[] = [];

  private readonly orderRequestIdempotency = new Map<string, number>();
  private readonly reservationIdempotency = new Map<string, number>();
  private readonly paymentIdempotency = new Map<string, number>();
  private readonly returnIdempotency = new Map<string, number>();
  private readonly quoteIdempotency = new Map<string, number>();

  constructor(
    @Inject(ExperienceStateStore)
    private readonly experience: ExperienceStateStore,
  ) {
    const bus = this.experience.getVariantById(this.experience.getProductBySlug("demo-bus").variants[0]!.id);
    const racer = this.experience.getVariantById(this.experience.getProductBySlug("demo-racer").variants[0]!.id);

    this.pricingRecords.push(
      {
        id: this.pricingSeq++,
        variant_id: bus.id,
        price_list_id: null,
        dealer_tier_id: null,
        dealer_company_id: null,
        market: "global",
        currency: "USD",
        price_type: "msrp",
        amount_minor: 3999,
        min_quantity: 1,
        rules: { source: "seed" },
        valid_from: null,
        valid_to: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: this.pricingSeq++,
        variant_id: bus.id,
        price_list_id: 1,
        dealer_tier_id: null,
        dealer_company_id: null,
        market: "global",
        currency: "USD",
        price_type: "price_list",
        amount_minor: 3499,
        min_quantity: 1,
        rules: { source: "seed" },
        valid_from: null,
        valid_to: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: this.pricingSeq++,
        variant_id: bus.id,
        price_list_id: null,
        dealer_tier_id: 1,
        dealer_company_id: null,
        market: "global",
        currency: "USD",
        price_type: "dealer_tier",
        amount_minor: 3199,
        min_quantity: 1,
        rules: { source: "seed" },
        valid_from: null,
        valid_to: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: this.pricingSeq++,
        variant_id: racer.id,
        price_list_id: null,
        dealer_tier_id: null,
        dealer_company_id: 1,
        market: "global",
        currency: "USD",
        price_type: "dealer_company",
        amount_minor: 2899,
        min_quantity: 1,
        rules: { source: "seed" },
        valid_from: null,
        valid_to: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    );

    this.inventoryBalances.push(
      {
        id: this.inventoryBalanceSeq++,
        variant_id: bus.id,
        warehouse_code: "WH-US-1",
        market: "global",
        on_hand: 120,
        available: 120,
        reserved: 0,
        source: "seed",
        synced_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: this.inventoryBalanceSeq++,
        variant_id: racer.id,
        warehouse_code: "WH-US-1",
        market: "global",
        on_hand: 80,
        available: 80,
        reserved: 0,
        source: "seed",
        synced_at: nowIso(),
        updated_at: nowIso(),
      },
    );
  }

  private getVariantSnapshot(variantId: number): JsonValue {
    const variant = this.experience.getVariantById(variantId);
    const product = this.experience.getProductById(variant.product_id);
    return {
      variant_id: variant.id,
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      sku: variant.sku,
      options: clone(variant.options),
      specifications: clone(variant.specifications),
      primary_image_url: variant.primary_image_url,
    };
  }

  private getPricingRecordIndex(id: number): number {
    const index = this.pricingRecords.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("价格记录不存在");
    }
    return index;
  }

  getPricingRecordById(id: number): PricingRecord {
    return clone(this.pricingRecords[this.getPricingRecordIndex(id)]!);
  }

  private getBalanceIndex(id: number): number {
    const index = this.inventoryBalances.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("库存不存在");
    }
    return index;
  }

  getInventoryBalanceById(id: number): InventoryBalance {
    return clone(this.inventoryBalances[this.getBalanceIndex(id)]!);
  }

  private getReservationIndex(id: number): number {
    const index = this.inventoryReservations.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("库存预占不存在");
    }
    return index;
  }

  getInventoryReservationById(id: number): InventoryReservation {
    return clone(this.inventoryReservations[this.getReservationIndex(id)]!);
  }

  private getCartIndex(id: number): number {
    const index = this.carts.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("购物车不存在");
    }
    return index;
  }

  private getOrderIndex(id: number): number {
    const index = this.orders.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("订单不存在");
    }
    return index;
  }

  private getPaymentIndex(id: number): number {
    const index = this.payments.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("支付记录不存在");
    }
    return index;
  }

  private getReturnIndex(id: number): number {
    const index = this.returnRequests.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("售后单不存在");
    }
    return index;
  }

  private getQuoteIndex(id: number): number {
    const index = this.quotes.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("报价不存在");
    }
    return index;
  }

  private buildPricingContext(input: PricingPreviewRequest) {
    return {
      market: input.market ?? "global",
      currency: input.currency ?? "USD",
      dealer_company_id: input.dealer_company_id ?? null,
      dealer_tier_id: input.dealer_tier_id ?? null,
      price_list_id: input.price_list_id ?? null,
    };
  }

  private rankPrice(record: PricingRecord, context: ReturnType<typeof this.buildPricingContext>): number {
    if (record.dealer_company_id && context.dealer_company_id && record.dealer_company_id === context.dealer_company_id) {
      return 0;
    }
    if (record.price_list_id && context.price_list_id && record.price_list_id === context.price_list_id) {
      return 1;
    }
    if (record.dealer_tier_id && context.dealer_tier_id && record.dealer_tier_id === context.dealer_tier_id) {
      return 2;
    }
    if (record.price_type === "promo") return 3;
    if (record.price_type === "msrp") return 4;
    if (record.price_type === "default_b2b") return 5;
    if (record.price_type === "dealer_tier") return 6;
    if (record.price_type === "price_list") return 7;
    if (record.price_type === "dealer_company") return 8;
    return 9;
  }

  private selectPriceRecord(
    variantId: number,
    quantity: number,
    context: ReturnType<typeof this.buildPricingContext>,
  ): PricingRecord | null {
    const candidates = this.pricingRecords.filter((record) => {
      if (record.variant_id !== variantId) return false;
      if (record.market !== context.market) return false;
      if (record.currency !== context.currency) return false;
      if (record.valid_from && record.valid_from > nowIso()) return false;
      if (record.valid_to && record.valid_to < nowIso()) return false;
      if (record.min_quantity > quantity) return false;
      if (context.dealer_company_id && record.dealer_company_id && record.dealer_company_id !== context.dealer_company_id) return false;
      if (context.dealer_tier_id && record.dealer_tier_id && record.dealer_tier_id !== context.dealer_tier_id) return false;
      if (context.price_list_id && record.price_list_id && record.price_list_id !== context.price_list_id) return false;
      return true;
    });

    const eligible = candidates.length > 0 ? candidates : this.pricingRecords.filter((record) => record.variant_id === variantId && record.market === context.market && record.currency === context.currency);
    const sorted = eligible.sort((left, right) => {
      const rankDiff = this.rankPrice(left, context) - this.rankPrice(right, context);
      if (rankDiff !== 0) return rankDiff;
      return right.min_quantity - left.min_quantity;
    });
    return sorted[0] ?? null;
  }

  listPricingRecords(query: PricingRecordListQuery) {
    const filtered = this.pricingRecords.filter((record) => {
      if (query.variant_id && record.variant_id !== query.variant_id) return false;
      if (query.market && record.market !== query.market) return false;
      if (query.currency && record.currency !== query.currency) return false;
      if (query.price_type && record.price_type !== query.price_type) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.updated_at.localeCompare(left.updated_at)), query.page, query.page_size);
  }

  previewPricing(input: PricingPreviewRequest) {
    const context = this.buildPricingContext(input);
    const items: PricingPreviewItem[] = [];
    let subtotal_minor = 0;

    for (const line of input.items) {
      const record = this.selectPriceRecord(line.variant_id, line.quantity, context);
      if (!record) {
        throw new NotFoundException("价格不存在");
      }
      const unit_price_minor = record.amount_minor;
      const line_total_minor = unit_price_minor * line.quantity;
      subtotal_minor += line_total_minor;
      items.push({
        variant_id: line.variant_id,
        quantity: line.quantity,
        currency: record.currency,
        price_type: record.price_type,
        price_record_id: record.id,
        dealer_company_id: record.dealer_company_id,
        dealer_tier_id: record.dealer_tier_id,
        price_list_id: record.price_list_id,
        unit_price_minor,
        line_total_minor,
        min_quantity: record.min_quantity,
        valid_from: record.valid_from,
        valid_to: record.valid_to,
        snapshot: {
          variant: this.getVariantSnapshot(line.variant_id),
          pricing_record: clone(record),
        } as Record<string, JsonValue>,
      });
    }

    return {
      currency: context.currency,
      subtotal_minor,
      source: items[0]?.price_type ?? "msrp",
      items,
    };
  }

  upsertPricingRecord(input: Partial<PricingRecord> & { variant_id: number; market: string; currency: string; price_type: PricingRecord["price_type"]; amount_minor: number; min_quantity?: number; rules?: JsonValue; valid_from?: string | null; valid_to?: string | null; id?: number }) {
    if (input.id) {
      const index = this.getPricingRecordIndex(input.id);
      const current = this.pricingRecords[index]!;
      const next: PricingRecord = {
        ...current,
        variant_id: input.variant_id ?? current.variant_id,
        price_list_id: input.price_list_id ?? current.price_list_id,
        dealer_tier_id: input.dealer_tier_id ?? current.dealer_tier_id,
        dealer_company_id: input.dealer_company_id ?? current.dealer_company_id,
        market: input.market ?? current.market,
        currency: input.currency ?? current.currency,
        price_type: input.price_type ?? current.price_type,
        amount_minor: input.amount_minor ?? current.amount_minor,
        min_quantity: input.min_quantity ?? current.min_quantity,
        rules: input.rules ?? current.rules,
        valid_from: input.valid_from ?? current.valid_from,
        valid_to: input.valid_to ?? current.valid_to,
        created_at: current.created_at,
        updated_at: nowIso(),
      };
      this.pricingRecords[index] = next;
      return clone(next);
    }

    const record: PricingRecord = {
      id: this.pricingSeq++,
      variant_id: input.variant_id,
      price_list_id: input.price_list_id ?? null,
      dealer_tier_id: input.dealer_tier_id ?? null,
      dealer_company_id: input.dealer_company_id ?? null,
      market: input.market,
      currency: input.currency,
      price_type: input.price_type,
      amount_minor: input.amount_minor,
      min_quantity: input.min_quantity ?? 1,
      rules: clone(input.rules ?? {}),
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.pricingRecords.push(record);
    return clone(record);
  }

  listInventoryBalances(query: InventoryBalanceListQuery) {
    const filtered = this.inventoryBalances.filter((balance) => {
      if (query.variant_id && balance.variant_id !== query.variant_id) return false;
      if (query.market && balance.market !== query.market) return false;
      if (query.warehouse_code && balance.warehouse_code !== query.warehouse_code) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.updated_at.localeCompare(left.updated_at)), query.page, query.page_size);
  }

  listInventoryReservations(query: InventoryReservationListQuery) {
    const filtered = this.inventoryReservations.filter((reservation) => {
      if (query.inventory_balance_id && reservation.inventory_balance_id !== query.inventory_balance_id) return false;
      if (query.owner_type && reservation.owner_type !== query.owner_type) return false;
      if (query.owner_id && reservation.owner_id !== query.owner_id) return false;
      if (query.status && reservation.status !== query.status) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  reserveInventory(input: InventoryReservationCreateInput, request_id: string) {
    const dedupeKey = `${input.idempotency_key}:${input.owner_type}:${input.owner_id}:${input.variant_id}`;
    const existingId = this.reservationIdempotency.get(dedupeKey);
    if (existingId) {
      const existing = this.inventoryReservations.find((entry) => entry.id === existingId);
      if (existing) {
        return clone(existing);
      }
    }

    const balance = this.inventoryBalances.find((entry) => {
      if (entry.variant_id !== input.variant_id) return false;
      if (input.market && entry.market !== input.market) return false;
      if (input.warehouse_code && entry.warehouse_code !== input.warehouse_code) return false;
      return true;
    });
    if (!balance) {
      throw new NotFoundException("库存不存在");
    }
    if (balance.available < input.quantity) {
      throw new ConflictException("库存不足");
    }

    balance.available -= input.quantity;
    balance.reserved += input.quantity;
    balance.updated_at = nowIso();

    const reservation: InventoryReservation = {
      id: this.inventoryReservationSeq++,
      inventory_balance_id: balance.id,
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      quantity: input.quantity,
      status: "active",
      expires_at: input.expires_at ?? null,
      idempotency_key: input.idempotency_key,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.inventoryReservations.push(reservation);
    this.reservationIdempotency.set(dedupeKey, reservation.id);
    return clone(reservation);
  }

  confirmInventoryReservation(id: number, request_id: string) {
    const index = this.getReservationIndex(id);
    const current = this.inventoryReservations[index]!;
    if (current.status === "confirmed") {
      return clone(current);
    }
    const balance = this.inventoryBalances[this.getBalanceIndex(current.inventory_balance_id)]!;
    const next: InventoryReservation = {
      ...current,
      status: "confirmed",
      updated_at: nowIso(),
    };
    if (balance.reserved >= current.quantity) {
      balance.reserved -= current.quantity;
      balance.updated_at = nowIso();
    }
    this.inventoryReservations[index] = next;
    return clone(next);
  }

  releaseInventory(id: number, request_id: string, reason?: string) {
    const index = this.getReservationIndex(id);
    const current = this.inventoryReservations[index]!;
    if (current.status === "released") {
      return clone(current);
    }
    const balance = this.inventoryBalances[this.getBalanceIndex(current.inventory_balance_id)]!;
    const next: InventoryReservation = {
      ...current,
      status: "released",
      updated_at: nowIso(),
    };
    if (balance.reserved >= current.quantity) {
      balance.reserved -= current.quantity;
      balance.available += current.quantity;
      balance.updated_at = nowIso();
    }
    this.inventoryReservations[index] = next;
    return clone(next);
  }

  getCartById(id: number): Cart {
    return clone(this.carts[this.getCartIndex(id)]!);
  }

  listCarts(query: CartListQuery) {
    const filtered = this.carts.filter((cart) => {
      if (query.user_id !== undefined && cart.user_id !== query.user_id) return false;
      if (query.company_id !== undefined && cart.company_id !== query.company_id) return false;
      if (query.status && cart.status !== query.status) return false;
      if (query.channel && cart.channel !== query.channel) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.updated_at.localeCompare(left.updated_at)), query.page, query.page_size);
  }

  createCart(input: {
    user_id: number | null;
    company_id: number | null;
    channel: Cart["channel"];
    market: string;
    currency: string;
  }): Cart {
    const cart: Cart = {
      id: this.cartSeq++,
      user_id: input.user_id,
      company_id: input.company_id,
      channel: input.channel,
      market: input.market,
      currency: input.currency,
      status: "active",
      items: [],
      subtotal_minor: 0,
      total_minor: 0,
      updated_at: nowIso(),
      expires_at: null,
      created_at: nowIso(),
    };
    this.carts.push(cart);
    return clone(cart);
  }

  getOrCreateCart(input: {
    user_id: number | null;
    company_id: number | null;
    channel: Cart["channel"];
    market: string;
    currency: string;
  }): Cart {
    const existing = this.carts.find((cart) =>
      cart.status === "active" &&
      cart.user_id === input.user_id &&
      cart.company_id === input.company_id &&
      cart.channel === input.channel &&
      cart.market === input.market &&
      cart.currency === input.currency,
    );
    return existing ? clone(existing) : this.createCart(input);
  }

  upsertCartItem(cartId: number, input: CartItemUpsertInput & { unit_price_minor: number; currency: string; snapshot: JsonValue }) {
    const index = this.getCartIndex(cartId);
    const current = this.carts[index]!;
    const itemIndex = current.items.findIndex((entry) => entry.variant_id === input.variant_id);
    const now = nowIso();
    const item: CartItem = {
      id: itemIndex >= 0 ? current.items[itemIndex]!.id : this.cartItemSeq++,
      variant_id: input.variant_id,
      quantity: input.quantity,
      unit_price_minor: input.unit_price_minor,
      line_total_minor: input.unit_price_minor * input.quantity,
      currency: input.currency,
      snapshot: clone(input.snapshot),
      added_at: itemIndex >= 0 ? current.items[itemIndex]!.added_at : now,
      updated_at: now,
    };

    const items = [...current.items];
    if (itemIndex >= 0) {
      items[itemIndex] = item;
    } else {
      items.push(item);
    }

    const subtotal_minor = items.reduce((sum, line) => sum + line.line_total_minor, 0);
    const next: Cart = {
      ...current,
      items,
      subtotal_minor,
      total_minor: subtotal_minor,
      updated_at: now,
    };
    this.carts[index] = next;
    return clone(next);
  }

  mergeCart(sourceCartId: number, targetCartId?: number): Cart {
    const source = this.getCartById(sourceCartId);
    const target = targetCartId ? this.getCartById(targetCartId) : source;
    if (source.id === target.id) {
      return clone(target);
    }

    let next = target;
    for (const item of source.items) {
      next = this.upsertCartItem(target.id, {
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_minor: item.unit_price_minor,
        currency: item.currency,
        snapshot: item.snapshot,
      });
    }

    const sourceIndex = this.getCartIndex(source.id);
    this.carts[sourceIndex] = {
      ...this.carts[sourceIndex]!,
      status: "converted",
      updated_at: nowIso(),
    };
    return next;
  }

  listOrders(query: OrderListQuery) {
    const filtered = this.orders.filter((order) => {
      if (query.channel && order.channel !== query.channel) return false;
      if (query.status && order.status !== query.status) return false;
      if (query.user_id !== undefined && order.user_id !== query.user_id) return false;
      if (query.company_id !== undefined && order.company_id !== query.company_id) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  getOrderById(id: number): Order {
    return clone(this.orders[this.getOrderIndex(id)]!);
  }

  findOrderByRequestId(request_id: string): Order | null {
    const existingId = this.orderRequestIdempotency.get(request_id);
    if (!existingId) {
      return null;
    }
    const existing = this.orders.find((entry) => entry.id === existingId);
    return existing ? clone(existing) : null;
  }

  createOrder(input: {
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
  }): Order {
    const existing = this.findOrderByRequestId(input.request_id);
    if (existing) {
      return existing;
    }

    const order: Order = {
      id: this.orderSeq++,
      order_no: `SO-${String(this.orderSeq - 1).padStart(6, "0")}`,
      channel: input.channel,
      user_id: input.user_id,
      company_id: input.company_id,
      currency: input.currency,
      subtotal_minor: input.subtotal_minor,
      tax_minor: input.tax_minor,
      shipping_minor: input.shipping_minor,
      total_minor: input.total_minor,
      status: input.status,
      address_snapshot: clone(input.address_snapshot),
      pricing_snapshot: clone(input.pricing_snapshot),
      items: input.items.map((item) => clone(item)),
      status_history: [orderStatusHistory(input.status, input.request_id, input.note ?? null)],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.orders.push(order);
    this.orderRequestIdempotency.set(input.request_id, order.id);
    return clone(order);
  }

  transitionOrder(id: number, nextStatus: OrderStatus, request_id: string, note?: string) {
    const index = this.getOrderIndex(id);
    const current = this.orders[index]!;
    if (current.status === nextStatus) {
      return clone(current);
    }
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending_payment: ["paid", "cancelled"],
      paid: ["processing", "completed", "cancelled", "refunded"],
      processing: ["partially_shipped", "shipped", "completed", "cancelled"],
      partially_shipped: ["shipped", "completed"],
      shipped: ["completed"],
      completed: [],
      cancelled: [],
      refunded: [],
      pending_review: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled", "completed"],
      awaiting_payment: ["confirmed", "cancelled", "paid"],
    };
    if (!allowed[current.status].includes(nextStatus)) {
      throw new ConflictException("订单状态不允许转换");
    }
    const next: Order = {
      ...current,
      status: nextStatus,
      updated_at: nowIso(),
      status_history: [...current.status_history, orderStatusHistory(nextStatus, request_id, note ?? null)],
    };
    this.orders[index] = next;
    return clone(next);
  }

  listPayments(query: PaymentListQuery) {
    const filtered = this.payments.filter((payment) => {
      if (query.order_id && payment.order_id !== query.order_id) return false;
      if (query.provider && payment.provider !== query.provider) return false;
      if (query.status && payment.status !== query.status) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  getPaymentById(id: number): Payment {
    return clone(this.payments[this.getPaymentIndex(id)]!);
  }

  createPayment(input: PaymentCreateInput & { request_id: string; provider_txn_id?: string | null; status?: PaymentStatus }) {
    const existingId = this.paymentIdempotency.get(input.idempotency_key);
    if (existingId) {
      const existing = this.payments.find((entry) => entry.id === existingId);
      if (existing) {
        return clone(existing);
      }
    }
    const payment: Payment = {
      id: this.paymentSeq++,
      order_id: input.order_id,
      provider: input.provider,
      provider_txn_id: input.provider_txn_id ?? null,
      status: input.status ?? "pending",
      amount_minor: input.amount_minor ?? 0,
      currency: input.payload && typeof input.payload === "object" && !Array.isArray(input.payload) && "currency" in input.payload && typeof (input.payload as Record<string, unknown>).currency === "string" ? String((input.payload as Record<string, unknown>).currency) : "USD",
      failure_reason: null,
      idempotency_key: input.idempotency_key,
      refunded_minor: 0,
      payload: clone(input.payload ?? {}) as JsonValue,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.payments.push(payment);
    this.paymentIdempotency.set(input.idempotency_key, payment.id);
    return clone(payment);
  }

  capturePayment(id: number, request_id: string, input: PaymentCaptureInput) {
    const index = this.getPaymentIndex(id);
    const current = this.payments[index]!;
    const next: Payment = {
      ...current,
      status: "paid",
      provider_txn_id: input.provider_txn_id ?? current.provider_txn_id,
      amount_minor: input.amount_minor ?? current.amount_minor,
      payload: clone(input.payload ?? current.payload),
      failure_reason: null,
      updated_at: nowIso(),
    };
    this.payments[index] = next;
    return clone(next);
  }

  refundPayment(
    id: number,
    request_id: string,
    input: { amount_minor?: number | undefined; reason?: string | undefined },
  ) {
    const index = this.getPaymentIndex(id);
    const current = this.payments[index]!;
    const refundAmount = input.amount_minor ?? current.amount_minor - current.refunded_minor;
    const refunded_minor = current.refunded_minor + refundAmount;
    const next: Payment = {
      ...current,
      refunded_minor,
      status: refunded_minor >= current.amount_minor ? "refunded" : "partially_refunded",
      failure_reason: input.reason ?? current.failure_reason,
      updated_at: nowIso(),
    };
    this.payments[index] = next;
    return clone(next);
  }

  listReturnRequests(query: ReturnListQuery) {
    const filtered = this.returnRequests.filter((entry) => {
      if (query.order_id && entry.order_id !== query.order_id) return false;
      if (query.user_id !== undefined && entry.user_id !== query.user_id) return false;
      if (query.company_id !== undefined && entry.company_id !== query.company_id) return false;
      if (query.status && entry.status !== query.status) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  getReturnRequestById(id: number): ReturnRequest {
    return clone(this.returnRequests[this.getReturnIndex(id)]!);
  }

  createReturnRequest(input: ReturnCreateInput & { user_id: number | null; company_id: number | null; request_id: string }) {
    const existing = this.returnRequests.find((entry) => entry.order_id === input.order_id && entry.history[0]?.request_id === input.request_id);
    if (existing) {
      return clone(existing);
    }
    const item: ReturnRequest = {
      id: this.returnSeq++,
      order_id: input.order_id,
      user_id: input.user_id,
      company_id: input.company_id,
      status: "requested",
      reason: input.reason,
      items: input.items.map((entry) => clone(entry)),
      attachments: [...input.attachments],
      history: [
        {
          status: "requested",
          note: null,
          request_id: input.request_id,
          created_at: nowIso(),
        },
      ],
      created_at: nowIso(),
      updated_at: nowIso(),
      refunded_at: null,
    };
    this.returnRequests.push(item);
    return clone(item);
  }

  reviewReturnRequest(id: number, request_id: string, decision: ReturnStatus, note?: string) {
    const index = this.getReturnIndex(id);
    const current = this.returnRequests[index]!;
    const allowed: Record<ReturnStatus, ReturnStatus[]> = {
      requested: ["approved", "rejected"],
      approved: ["in_transit", "received", "refunded", "closed"],
      rejected: [],
      in_transit: ["received", "refunded", "closed"],
      received: ["refunded", "closed"],
      refunded: ["closed"],
      closed: [],
    };
    if (!allowed[current.status].includes(decision)) {
      throw new ConflictException("售后状态不允许转换");
    }
    const next: ReturnRequest = {
      ...current,
      status: decision,
      updated_at: nowIso(),
      refunded_at: decision === "refunded" ? nowIso() : current.refunded_at,
      history: [
        ...current.history,
        {
          status: decision,
          note: note ?? null,
          request_id,
          created_at: nowIso(),
        },
      ],
    };
    this.returnRequests[index] = next;
    return clone(next);
  }

  listQuotes(query: QuoteListQuery) {
    const filtered = this.quotes.filter((quote) => {
      if (query.company_id && quote.company_id !== query.company_id) return false;
      if (query.status && quote.status !== query.status) return false;
      return true;
    });
    return paginate(filtered.sort((left, right) => right.created_at.localeCompare(left.created_at)), query.page, query.page_size);
  }

  getQuoteById(id: number): Quote {
    return clone(this.quotes[this.getQuoteIndex(id)]!);
  }

  findQuoteByRequestId(request_id: string): Quote | null {
    const existingId = this.quoteIdempotency.get(request_id);
    if (!existingId) {
      return null;
    }
    const existing = this.quotes.find((entry) => entry.id === existingId);
    return existing ? clone(existing) : null;
  }

  listQuoteVersions(quote_id: number) {
    const filtered = this.quoteVersions.filter((entry) => entry.quote_id === quote_id);
    return paginate(filtered.sort((left, right) => right.version - left.version));
  }

  createQuote(input: QuoteCreateInput & { company_id: number; requested_by_user_id: number | null; request_id: string }) {
    const existing = this.findQuoteByRequestId(input.request_id);
    if (existing) {
      return existing;
    }
    const id = this.quoteSeq++;
    const item: Quote = {
      id,
      quote_no: `Q-${String(id).padStart(6, "0")}`,
      company_id: input.company_id,
      requested_by_user_id: input.requested_by_user_id,
      current_version: 1,
      status: "requested",
      valid_until: daysFromNow(input.valid_days),
      converted_order_id: null,
      pricing_snapshot: clone(input.pricing_snapshot),
      terms_snapshot: clone(input.terms_snapshot),
      items: input.items.map((entry) => clone(entry)),
      versions: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    const version: QuoteVersion = {
      id: this.quoteVersionSeq++,
      quote_id: item.id,
      version: 1,
      snapshot: clone({
        items: item.items,
        pricing_snapshot: item.pricing_snapshot,
        terms_snapshot: item.terms_snapshot,
        status: item.status,
        valid_until: item.valid_until,
      }),
      created_by: input.requested_by_user_id ?? 1,
      created_at: nowIso(),
    };
    item.versions = [version];
    this.quotes.push(item);
    this.quoteVersions.push(version);
    this.quoteIdempotency.set(input.request_id, item.id);
    return clone(item);
  }

  reviewQuote(id: number, request_id: string, input: { decision: "under_review" | "quoted" | "rejected" | "expired"; note?: string; terms_snapshot?: JsonValue }) {
    const index = this.getQuoteIndex(id);
    const current = this.quotes[index]!;
    const nextVersion = current.current_version + 1;
    const next: Quote = {
      ...current,
      status: input.decision,
      current_version: nextVersion,
      terms_snapshot: input.terms_snapshot ?? current.terms_snapshot,
      updated_at: nowIso(),
    };
    const version: QuoteVersion = {
      id: this.quoteVersionSeq++,
      quote_id: next.id,
      version: nextVersion,
      snapshot: clone({
        items: next.items,
        pricing_snapshot: next.pricing_snapshot,
        terms_snapshot: next.terms_snapshot,
        status: next.status,
        valid_until: next.valid_until,
        note: input.note ?? null,
      }),
      created_by: current.requested_by_user_id ?? 1,
      created_at: nowIso(),
    };
    next.versions = [...current.versions, version];
    this.quotes[index] = next;
    this.quoteVersions.push(version);
    return clone(next);
  }

  convertQuote(
    id: number,
    request_id: string,
    input: {
      order_channel: CommerceChannel;
      accepted_version?: number;
      note?: string;
      converted_order_id?: number | null;
    },
  ) {
    const index = this.getQuoteIndex(id);
    const current = this.quotes[index]!;
    if (!["quoted", "accepted"].includes(current.status)) {
      throw new ConflictException("报价不能转单");
    }
    if (input.accepted_version && input.accepted_version > current.current_version) {
      throw new ConflictException("报价版本不存在");
    }
    const next: Quote = {
      ...current,
      status: "converted",
      converted_order_id:
        input.converted_order_id ?? current.converted_order_id ?? null,
      updated_at: nowIso(),
    };
    this.quotes[index] = next;
    return clone(next);
  }
}
