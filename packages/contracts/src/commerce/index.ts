import { z } from "zod";

import {
  createItemResponseSchema,
  createListResponseSchema,
  EntityIdSchema,
  JsonValueSchema,
  PaginationSchema,
} from "../common/index.js";

export const MoneySchema = z
  .object({
    amount_minor: z.number().int(),
    currency: z.string().length(3),
  })
  .strict();

export const CommerceChannelSchema = z.enum([
  "guest",
  "user",
  "dealer",
  "b2c",
  "b2b",
]);

export const CartStatusSchema = z.enum(["active", "converted"]);
export const InventoryReservationStatusSchema = z.enum([
  "active",
  "confirmed",
  "released",
]);

export const QuoteStatusSchema = z.enum([
  "draft",
  "requested",
  "under_review",
  "quoted",
  "accepted",
  "rejected",
  "expired",
  "converted",
]);

export const B2cOrderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "processing",
  "partially_shipped",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
]);

export const B2bOrderStatusSchema = z.enum([
  "pending_review",
  "confirmed",
  "awaiting_payment",
  "processing",
  "partially_shipped",
  "shipped",
  "completed",
  "cancelled",
]);

export const OrderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "processing",
  "partially_shipped",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "pending_review",
  "confirmed",
  "awaiting_payment",
]);

export const PaymentStatusSchema = z.enum([
  "pending",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
]);

export const ReturnStatusSchema = z.enum([
  "requested",
  "approved",
  "rejected",
  "in_transit",
  "received",
  "refunded",
  "closed",
]);

const PageListSchema = PaginationSchema;

const SnapshotSchema = z.record(z.string(), JsonValueSchema);

const CartItemSchema = z
  .object({
    id: EntityIdSchema,
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
    unit_price_minor: z.number().int(),
    line_total_minor: z.number().int(),
    currency: z.string().length(3),
    snapshot: JsonValueSchema,
    added_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const CartSchema = z
  .object({
    id: EntityIdSchema,
    user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    channel: CommerceChannelSchema,
    market: z.string().min(1),
    currency: z.string().length(3),
    status: CartStatusSchema,
    items: z.array(CartItemSchema),
    subtotal_minor: z.number().int(),
    total_minor: z.number().int(),
    updated_at: z.string().datetime(),
    expires_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const CartItemUpsertSchema = z
  .object({
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
  })
  .strict();

export const CartListQuerySchema = PageListSchema.extend({
  user_id: EntityIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
  status: CartStatusSchema.optional(),
  channel: CommerceChannelSchema.optional(),
});

export const CartMergeSchema = z
  .object({
    source_cart_id: EntityIdSchema,
    target_cart_id: EntityIdSchema.optional(),
  })
  .strict();

export const CartListResponseSchema = createListResponseSchema(CartSchema);
export const CartMutationResponseSchema = createItemResponseSchema(CartSchema);

export const PricingPreviewItemSchema = z
  .object({
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
    currency: z.string().length(3),
    price_type: z.string().min(1),
    price_record_id: EntityIdSchema,
    dealer_company_id: EntityIdSchema.nullable(),
    dealer_tier_id: EntityIdSchema.nullable(),
    price_list_id: EntityIdSchema.nullable(),
    unit_price_minor: z.number().int(),
    line_total_minor: z.number().int(),
    min_quantity: z.number().int().positive(),
    valid_from: z.string().datetime().nullable(),
    valid_to: z.string().datetime().nullable(),
    snapshot: SnapshotSchema,
  })
  .strict()
  .passthrough();

export const PricingPreviewRequestSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            variant_id: EntityIdSchema,
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
    market: z.string().min(1).optional(),
    currency: z.string().length(3).optional(),
    dealer_company_id: EntityIdSchema.optional(),
    dealer_tier_id: EntityIdSchema.optional(),
    price_list_id: EntityIdSchema.optional(),
  })
  .strict();

export const PricingPreviewResponseSchema = createItemResponseSchema(
  z
    .object({
      currency: z.string().length(3),
      subtotal_minor: z.number().int(),
      source: z.string().min(1),
      items: z.array(PricingPreviewItemSchema),
    })
    .strict()
    .passthrough(),
);

export const PricingRecordSchema = z
  .object({
    id: EntityIdSchema,
    variant_id: EntityIdSchema,
    price_list_id: EntityIdSchema.nullable(),
    dealer_tier_id: EntityIdSchema.nullable(),
    dealer_company_id: EntityIdSchema.nullable(),
    market: z.string().min(1),
    currency: z.string().length(3),
    price_type: z.string().min(1),
    amount_minor: z.number().int(),
    min_quantity: z.number().int().positive(),
    rules: JsonValueSchema,
    valid_from: z.string().datetime().nullable(),
    valid_to: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const PricingRecordListQuerySchema = PageListSchema.extend({
  variant_id: EntityIdSchema.optional(),
  market: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
  price_type: z.string().min(1).optional(),
});

export const PricingRecordUpsertSchema = z
  .object({
    variant_id: EntityIdSchema,
    market: z.string().min(1),
    currency: z.string().length(3),
    price_type: z.string().min(1),
    amount_minor: z.number().int(),
    min_quantity: z.number().int().positive().optional(),
    rules: JsonValueSchema.optional(),
    valid_from: z.string().datetime().nullable().optional(),
    valid_to: z.string().datetime().nullable().optional(),
    price_list_id: EntityIdSchema.nullable().optional(),
    dealer_tier_id: EntityIdSchema.nullable().optional(),
    dealer_company_id: EntityIdSchema.nullable().optional(),
  })
  .strict();

export const PricingRecordListResponseSchema =
  createListResponseSchema(PricingRecordSchema);
export const PricingRecordMutationResponseSchema =
  createItemResponseSchema(PricingRecordSchema);

export const InventoryBalanceSchema = z
  .object({
    id: EntityIdSchema,
    variant_id: EntityIdSchema,
    warehouse_code: z.string().min(1),
    market: z.string().min(1),
    on_hand: z.number().int(),
    available: z.number().int(),
    reserved: z.number().int(),
    source: z.string().min(1),
    synced_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const InventoryBalanceListQuerySchema = PageListSchema.extend({
  variant_id: EntityIdSchema.optional(),
  market: z.string().min(1).optional(),
  warehouse_code: z.string().min(1).optional(),
});

export const InventoryBalanceListResponseSchema =
  createListResponseSchema(InventoryBalanceSchema);

export const InventoryReservationSchema = z
  .object({
    id: EntityIdSchema,
    inventory_balance_id: EntityIdSchema,
    owner_type: z.string().min(1),
    owner_id: EntityIdSchema,
    quantity: z.number().int().positive(),
    status: InventoryReservationStatusSchema,
    expires_at: z.string().datetime().nullable(),
    idempotency_key: z.string().min(1),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const InventoryReservationCreateSchema = z
  .object({
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
    owner_type: z.string().min(1),
    owner_id: EntityIdSchema,
    warehouse_code: z.string().min(1).optional(),
    market: z.string().min(1).optional(),
    idempotency_key: z.string().min(1),
    expires_at: z.string().datetime().nullable().optional(),
  })
  .strict();

export const InventoryReservationListQuerySchema = PageListSchema.extend({
  inventory_balance_id: EntityIdSchema.optional(),
  owner_type: z.string().min(1).optional(),
  owner_id: EntityIdSchema.optional(),
  status: InventoryReservationStatusSchema.optional(),
});

export const InventoryReservationActionSchema = z
  .object({
    reason: z.string().min(1).optional(),
  })
  .strict();

export const InventoryReservationListResponseSchema =
  createListResponseSchema(InventoryReservationSchema);
export const InventoryReservationMutationResponseSchema =
  createItemResponseSchema(InventoryReservationSchema);

const OrderItemSchema = z
  .object({
    id: EntityIdSchema,
    variant_id: EntityIdSchema.nullable(),
    sku_snapshot: z.string().min(1),
    name_snapshot: z.string().min(1),
    quantity: z.number().int().positive(),
    unit_price_minor: z.number().int(),
    tax_minor: z.number().int(),
    shipping_minor: z.number().int(),
    total_minor: z.number().int(),
    detail_snapshot: JsonValueSchema,
  })
  .strict()
  .passthrough();

export const OrderSchema = z
  .object({
    id: EntityIdSchema,
    order_no: z.string().min(1),
    channel: z.enum(["b2c", "b2b"]),
    user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    currency: z.string().length(3),
    subtotal_minor: z.number().int(),
    tax_minor: z.number().int(),
    shipping_minor: z.number().int(),
    total_minor: z.number().int(),
    status: OrderStatusSchema,
    address_snapshot: JsonValueSchema,
    pricing_snapshot: JsonValueSchema,
    items: z.array(OrderItemSchema),
    status_history: z
      .array(
        z
          .object({
            status: OrderStatusSchema,
            request_id: z.string().min(1),
            note: z.string().min(1).nullable(),
            created_at: z.string().datetime(),
          })
          .strict(),
      )
      .default([]),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const OrderCreateSchema = z
  .object({
    channel: z.enum(["b2c", "b2b"]),
    items: z
      .array(
        z
          .object({
            variant_id: EntityIdSchema,
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
    address_snapshot: JsonValueSchema,
    cart_id: EntityIdSchema.optional(),
    quote_id: EntityIdSchema.optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const OrderListQuerySchema = PageListSchema.extend({
  channel: z.enum(["b2c", "b2b"]).optional(),
  status: OrderStatusSchema.optional(),
  user_id: EntityIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
});

export const OrderListResponseSchema = createListResponseSchema(OrderSchema);
export const OrderMutationResponseSchema = createItemResponseSchema(OrderSchema);

export const PaymentSchema = z
  .object({
    id: EntityIdSchema,
    order_id: EntityIdSchema,
    provider: z.string().min(1),
    provider_txn_id: z.string().min(1).nullable(),
    status: PaymentStatusSchema,
    amount_minor: z.number().int(),
    currency: z.string().length(3),
    failure_reason: z.string().min(1).nullable(),
    idempotency_key: z.string().min(1),
    refunded_minor: z.number().int(),
    payload: JsonValueSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const PaymentCreateSchema = z
  .object({
    order_id: EntityIdSchema,
    provider: z.string().min(1),
    idempotency_key: z.string().min(1),
    amount_minor: z.number().int().optional(),
    payload: JsonValueSchema.optional(),
  })
  .strict();

export const PaymentCaptureSchema = z
  .object({
    provider_txn_id: z.string().min(1).nullable().optional(),
    amount_minor: z.number().int().optional(),
    payload: JsonValueSchema.optional(),
  })
  .strict();

export const PaymentRefundSchema = z
  .object({
    amount_minor: z.number().int().optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();

export const PaymentListQuerySchema = PageListSchema.extend({
  order_id: EntityIdSchema.optional(),
  provider: z.string().min(1).optional(),
  status: PaymentStatusSchema.optional(),
});

export const PaymentListResponseSchema = createListResponseSchema(PaymentSchema);
export const PaymentMutationResponseSchema =
  createItemResponseSchema(PaymentSchema);

const QuoteLineItemSchema = z
  .object({
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
  })
  .strict()
  .passthrough();

const QuoteVersionSnapshotSchema = z
  .object({
    items: z.array(QuoteLineItemSchema),
    pricing_snapshot: JsonValueSchema,
    terms_snapshot: JsonValueSchema,
    status: QuoteStatusSchema,
    valid_until: z.string().datetime(),
    note: z.string().min(1).nullable().optional(),
  })
  .strict()
  .passthrough();

export const QuoteVersionSchema = z
  .object({
    id: EntityIdSchema,
    quote_id: EntityIdSchema,
    version: z.number().int().positive(),
    snapshot: QuoteVersionSnapshotSchema,
    created_by: EntityIdSchema,
    created_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const QuoteSchema = z
  .object({
    id: EntityIdSchema,
    quote_no: z.string().min(1),
    company_id: EntityIdSchema,
    requested_by_user_id: EntityIdSchema.nullable(),
    current_version: z.number().int().positive(),
    status: QuoteStatusSchema,
    valid_until: z.string().datetime(),
    converted_order_id: EntityIdSchema.nullable(),
    pricing_snapshot: JsonValueSchema,
    terms_snapshot: JsonValueSchema,
    items: z.array(QuoteLineItemSchema),
    versions: z.array(QuoteVersionSchema),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict()
  .passthrough();

export const QuoteCreateSchema = z
  .object({
    company_id: EntityIdSchema.optional(),
    items: z.array(QuoteLineItemSchema).min(1),
    pricing_snapshot: JsonValueSchema,
    terms_snapshot: JsonValueSchema,
    valid_days: z.number().int().positive(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const QuoteReviewSchema = z
  .object({
    decision: z.enum(["under_review", "quoted", "rejected", "expired"]),
    note: z.string().min(1).optional(),
    terms_snapshot: JsonValueSchema.optional(),
  })
  .strict();

export const QuoteConvertSchema = z
  .object({
    order_channel: z.enum(["b2c", "b2b"]),
    accepted_version: z.number().int().positive().optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const QuoteListQuerySchema = PageListSchema.extend({
  company_id: EntityIdSchema.optional(),
  status: QuoteStatusSchema.optional(),
});

export const QuoteListResponseSchema = createListResponseSchema(QuoteSchema);
export const QuoteVersionListResponseSchema =
  createListResponseSchema(QuoteVersionSchema);
export const QuoteMutationResponseSchema = createItemResponseSchema(QuoteSchema);

const ReturnLineItemSchema = z
  .object({
    variant_id: EntityIdSchema,
    quantity: z.number().int().positive(),
    reason: z.string().min(1),
    snapshot: JsonValueSchema,
  })
  .strict()
  .passthrough();

const ReturnHistorySchema = z
  .object({
    status: ReturnStatusSchema,
    note: z.string().min(1).nullable(),
    request_id: z.string().min(1),
    created_at: z.string().datetime(),
  })
  .strict();

export const ReturnRequestSchema = z
  .object({
    id: EntityIdSchema,
    order_id: EntityIdSchema,
    user_id: EntityIdSchema.nullable(),
    company_id: EntityIdSchema.nullable(),
    status: ReturnStatusSchema,
    reason: z.string().min(1),
    items: z.array(ReturnLineItemSchema),
    attachments: z.array(EntityIdSchema),
    history: z.array(ReturnHistorySchema),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    refunded_at: z.string().datetime().nullable(),
  })
  .strict()
  .passthrough();

export const ReturnCreateSchema = z
  .object({
    order_id: EntityIdSchema,
    reason: z.string().min(1),
    items: z.array(ReturnLineItemSchema).min(1),
    attachments: z.array(EntityIdSchema).default([]),
  })
  .strict();

export const ReturnReviewSchema = z
  .object({
    decision: ReturnStatusSchema,
    note: z.string().min(1).optional(),
  })
  .strict();

export const ReturnListQuerySchema = PageListSchema.extend({
  order_id: EntityIdSchema.optional(),
  user_id: EntityIdSchema.optional(),
  company_id: EntityIdSchema.optional(),
  status: ReturnStatusSchema.optional(),
});

export const ReturnListResponseSchema =
  createListResponseSchema(ReturnRequestSchema);
export const ReturnMutationResponseSchema =
  createItemResponseSchema(ReturnRequestSchema);

export type Money = z.infer<typeof MoneySchema>;
export type CommerceChannel = z.infer<typeof CommerceChannelSchema>;
export type CartStatus = z.infer<typeof CartStatusSchema>;
export type InventoryReservationStatus = z.infer<
  typeof InventoryReservationStatusSchema
>;
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;
export type B2cOrderStatus = z.infer<typeof B2cOrderStatusSchema>;
export type B2bOrderStatus = z.infer<typeof B2bOrderStatusSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type CartItemUpsertInput = z.infer<typeof CartItemUpsertSchema>;
export type CartListQuery = z.infer<typeof CartListQuerySchema>;
export type InventoryBalance = z.infer<typeof InventoryBalanceSchema>;
export type InventoryBalanceListQuery = z.infer<
  typeof InventoryBalanceListQuerySchema
>;
export type InventoryReservation = z.infer<typeof InventoryReservationSchema>;
export type InventoryReservationCreateInput = z.infer<
  typeof InventoryReservationCreateSchema
>;
export type InventoryReservationListQuery = z.infer<
  typeof InventoryReservationListQuerySchema
>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentCaptureInput = z.infer<typeof PaymentCaptureSchema>;
export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
export type PaymentListQuery = z.infer<typeof PaymentListQuerySchema>;
export type PricingPreviewItem = z.infer<typeof PricingPreviewItemSchema>;
export type PricingPreviewRequest = z.infer<typeof PricingPreviewRequestSchema>;
export type PricingRecord = z.infer<typeof PricingRecordSchema>;
export type PricingRecordListQuery = z.infer<typeof PricingRecordListQuerySchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type QuoteCreateInput = z.infer<typeof QuoteCreateSchema>;
export type QuoteListQuery = z.infer<typeof QuoteListQuerySchema>;
export type QuoteVersion = z.infer<typeof QuoteVersionSchema>;
export type ReturnCreateInput = z.infer<typeof ReturnCreateSchema>;
export type ReturnListQuery = z.infer<typeof ReturnListQuerySchema>;
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>;
