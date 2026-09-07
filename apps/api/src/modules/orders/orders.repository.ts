import type {
  Order,
  OrderItem,
  OrderListQuery,
  OrderStatus,
  Shipment,
  ShipmentCreateInput,
} from "@wemo/contracts";
import type { JsonValue } from "@wemo/contracts/common";

export const ORDERS_REPOSITORY = Symbol("ORDERS_REPOSITORY");

/** 落库用订单命令：service 负责拼装金额快照与定价明细，repository 负责写入 orders/order_items */
export interface OrderCreateCommand {
  channel: "b2b" | "b2c";
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
}

export interface OrdersRepository {
  listOrders(query: OrderListQuery): Promise<{ items: Order[]; total: number; page: number; page_size: number }>;
  getOrderById(id: number): Promise<Order | null>;
  createOrder(input: OrderCreateCommand): Promise<Order>;
  findOrderByRequestId(requestId: string): Promise<Order | null>;
  transitionOrder(
    orderId: number,
    status: OrderStatus,
    requestId: string,
    actorId: number | null,
    note?: string,
  ): Promise<Order>;
  /** 市场交易开关 需求 5.2/ACC-005 按市场关闭零售或经销商交易 */
  getMarketCommerceSettings(
    market: string,
  ): Promise<{ b2c_enabled: boolean; dealer_enabled: boolean }>;
  /** 变体标识快照 订单行固化 SKU 与商品名 并携带所属商品用于折扣码商品范围校验 */
  getVariantIdentity(
    variantIds: number[],
  ): Promise<Map<number, { sku: string; name: string; product_id: number }>>;
  /** 变体可售库存合计 */
  getAvailableStock(variantIds: number[], market: string): Promise<Map<number, number>>;
  /** 订单行明细 供退货行项校验与复购 */
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  /** 分批发货 需求 ORD-B2B-005/ADM-O-005 */
  listShipments(orderId: number): Promise<Shipment[]>;
  createShipment(
    orderId: number,
    input: ShipmentCreateInput,
    actorId: number,
    requestId: string,
  ): Promise<{ shipment: Shipment; order: Order }>;
}
