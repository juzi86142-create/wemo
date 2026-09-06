import type { Cart, CartItemUpsertInput, CartListQuery, CartMergeInput, CartMutationResponse, Pagination } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const CART_REPOSITORY = Symbol("CART_REPOSITORY");

export interface CartRepository {
  getOrCreateCart(ctx: { channel: string; user_id: number | null; company_id: number | null; market: string; currency: string; dealer_company_id?: number }): Promise<CartMutationResponse["item"]>;
  listCarts(query: CartListQuery): Promise<{ items: Cart[]; total: number; page: number; page_size: number }>;
  upsertCartItem(cartId: number, input: CartItemUpsertInput): Promise<{ id: number; cart_id: number; variant_id: number; quantity: number; unit_price_minor: number; currency: string }>;
  removeCartItem(cartId: number, itemId: number): Promise<void>;
  mergeCarts(input: CartMergeInput): Promise<CartMutationResponse["item"]>;
  clearCart(cartId: number): Promise<void>;
  previewPricing(input: { items: { variant_id: number; quantity: number }[]; market: string; currency: string; dealer_company_id?: number }): Promise<{ items: { variant_id: number; quantity: number; unit_price_minor: number; currency: string }[] }>;
}
