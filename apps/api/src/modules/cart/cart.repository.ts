import { z } from "zod";
import {
  CartMergeSchema,
  type Cart,
  type CartItemUpsertInput,
  type CartListQuery,
} from "@wemo/contracts";

export const CART_REPOSITORY = Symbol("CART_REPOSITORY");

/** CartMergeSchema 的输出形状（契约仅导出 CartMergeSchema，未导出对应 type）。 */
export type CartMergeInput = z.infer<typeof CartMergeSchema>;

/**
 * 购物车运行时上下文（由 CartService.resolveContext 构造，
 * dealer_company_id 属性始终存在、值可能为 undefined）。
 */
export type CartContext = {
  channel: string;
  user_id: number | null;
  company_id: number | null;
  market: string;
  currency: string;
  dealer_company_id: number | undefined;
  /** 游客购物车标识 客户端本地保存 需求 5.2 */
  guest_cart_id: string | null;
};

export type CartPage = {
  items: Cart[];
  total: number;
  page: number;
  page_size: number;
};

/** 加入购物车时的单价快照（由价格预览结果回填）。 */
export type CartItemPricingInput = CartItemUpsertInput & {
  unit_price_minor: number;
  currency: string;
  snapshot: unknown;
};

export type CartPreviewPricingInput = {
  items: { variant_id: number; quantity: number }[];
  market: string;
  currency: string;
  dealer_company_id?: number;
};

export type CartPreviewPricingResult = {
  items: {
    variant_id: number;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
    currency: string;
    snapshot: unknown;
  }[];
};

export interface CartRepository {
  getOrCreateCart(ctx: CartContext): Promise<Cart>;
  /** 市场零售开关 需求 5.2 关闭时禁止游客与用户加购 */
  isMarketB2cEnabled(market: string): Promise<boolean>;
  listCarts(query: CartListQuery): Promise<CartPage>;
  upsertCartItem(cartId: number, input: CartItemPricingInput): Promise<Cart>;
  removeCartItem(cartId: number, itemId: number): Promise<void>;
  mergeCarts(input: CartMergeInput): Promise<Cart>;
  clearCart(cartId: number): Promise<void>;
  previewPricing(input: CartPreviewPricingInput): Promise<CartPreviewPricingResult>;
}
