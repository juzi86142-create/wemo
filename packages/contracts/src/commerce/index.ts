import { z } from "zod";

export const MoneySchema = z.object({
  amount_minor: z.number().int(),
  currency: z.string().length(3),
});

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

export type Money = z.infer<typeof MoneySchema>;
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;
export type B2cOrderStatus = z.infer<typeof B2cOrderStatusSchema>;
export type B2bOrderStatus = z.infer<typeof B2bOrderStatusSchema>;
