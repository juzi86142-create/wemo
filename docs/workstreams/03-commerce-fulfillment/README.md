# 03 交易与履约

## 目标

交付 B2C 与 B2B 的价格、库存、购物车、报价、订单、付款、发货和售后闭环，并确保金额、商品、地址、条款和状态历史不会被当前配置反向改写。

## 所有权

- API：`pricing`、`inventory`、`cart`、`orders`、`payments`、`returns`、`quotes`。
- 前端：`account/{cart,checkout,orders,returns}`、`dealer/{catalog,quick-order,quotes,orders,invoices,downloads}`、`admin/{pricing,inventory,orders,quotes}`，以及对应的 `src/app` 路由叶子。
- 共享包：`contracts/commerce`，数据库 `pricing/inventory/commerce` 领域，UI `commerce/b2b`。
- 需求入口：第 5.2、6.3 至 6.6、7.5 至 7.8、8.4、8.5、9、16.4 章，以及 `B2B-*`、`QTE-*`、`ORD-B2B-*`、`ADM-PR-*`、`ADM-O-*`。

## 实施顺序

1. 先完成金额最小单位、价格来源、库存预占、B2C/B2B 订单、报价、付款和售后状态契约及历史模型。
2. 贯通“按 actor/市场解析商品 -> 服务端定价 -> 预占库存 -> 创建订单/报价 -> 幂等确认 -> 固化快照”的核心链路。
3. 再扩展游客购物车合并、MOQ/倍数/箱规、CSV 快速下单、拆分发货、退款、退货、复购和后台人工处理。
4. 支付、税、物流和 WMS 只通过 04 的 adapter；回调必须验签、防重放并绑定唯一业务尝试。

## 协作面

- 消费 01 的可售 SKU 与商品快照查询，消费 02 的 actor、企业状态、授权分类、账期和 `company_id` 范围。
- 向 01 提供按市场/actor 组合价格库存的只读视图，向 02 提供用户/企业订单摘要，向 04 发布不可重复消费的交易事件和报表查询口径。
- 审计、outbox、异步任务、支付/税/物流 adapter 由 04 提供；本工作流保留业务事务和幂等真相。

## 完成标准

必须以真实结算、报价转单、支付回调和售后入口覆盖价格优先级、过期规则、库存竞争、重复回调、非法状态转换、跨企业访问、部分退款/发货及快照不可变。仅测试独立计算函数不足以标记完成。
