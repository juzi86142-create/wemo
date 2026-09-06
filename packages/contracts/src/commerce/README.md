# Commerce 契约

- 金额统一使用最小货币单位整数和三位币种（`MoneySchema`），禁止浮点金额跨 API 传递。
- 定义 B2C/B2B 订单、报价/版本、支付、退货状态与命令/响应，以及计价预览（`PricingPreview*`）、价格记录（`PricingRecord*`）与库存（`InventoryBalance*`）契约。
- 订单行和报价版本需要商品、SKU、金额、税、折扣、条款等快照字段（`detail_snapshot`/`pricing_snapshot`/版本 `snapshot`）。
- `CartSchema`/`CartItemUpsertSchema`/`CartMergeSchema` 与 `InventoryReservation*` 契约仍保留，供客户端状态与既有 API 形状使用；演示模式服务端暂未持久化（`carts`/`cart_items`、`inventory_reservations` 表已从 schema 移除，cart 模块为 stub、库存预占接口抛「Demo模式：暂不支持库存预占」；订单可携带可选 `cart_id` 仅供关联展示）。
