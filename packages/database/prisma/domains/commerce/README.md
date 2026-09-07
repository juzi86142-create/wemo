# Commerce 数据

- 订单/行、报价/版本、支付、发货、退货申请是当前交易核心，落 PostgreSQL；购物车与行持久化在 Redis（`wemo:cart:{id}` 头部与 `wemo:cart:{id}:items` 行、`wemo:cart:by-user:{userId}` 登录用户索引），`cart.previewPricing` 按 `prices` 表真实计价。
- 订单保存地址、价格来源与商品行快照（`address_snapshot`/`pricing_snapshot`/`detail_snapshot`），历史展示不依赖当前商品或规则；地址本不落 PostgreSQL，持久化在 Redis（见 identity 域）。
- user/company/variant/order/quote 等关联均为逻辑 ID 并建立访问索引，服务层负责边界和存在性。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| Order | `orders` | B2C/B2B 订单主表，含地址/价格快照 Json |
| OrderItem | `order_items` | 订单商品行快照（SKU/名称/单价/税/总额） |
| Quote | `quotes` | B2B 报价主表，company 隔离 |
| QuoteVersion | `quote_versions` | 报价版本快照（snapshot Json） |
| Payment | `payments` | 支付记录（provider、幂等键、状态） |
| Shipment | `shipments` | 发货记录（承运商/追踪号/条目 Json） |
| ReturnRequest | `return_requests` | 退货/售后申请（原因、条目与附件 Json） |
