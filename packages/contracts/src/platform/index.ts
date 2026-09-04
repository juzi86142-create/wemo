import { z } from "zod";

export const AnalyticsEventNameSchema = z.enum([
  "view_home",
  "view_product_list",
  "view_product",
  "search",
  "select_filter",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "dealer_apply_start",
  "dealer_apply_submit",
  "request_quote",
  "download_asset",
  "contact_submit",
  "newsletter_subscribe",
]);

export const MarketContextSchema = z.object({
  market: z.string().min(2),
  locale: z.string().min(2),
  currency: z.string().length(3),
  b2c_enabled: z.boolean(),
  dealer_enabled: z.boolean(),
});

export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;
export type MarketContext = z.infer<typeof MarketContextSchema>;
