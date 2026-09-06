# Pricing 数据

- 价格表（`price_lists`）与价格记录（`prices`）支持市场、币种、价格类型、有效期与阶梯数量（min_quantity/rules Json）。
- `prices.dealer_company_id`/`dealer_tier_id`/`price_list_id` 表达企业专属、等级与价格表逻辑关联；企业专属价优先于等级价、再回退列表价由服务层裁决。
- 价格记录用 `valid_from`/`valid_to` 表达生效窗口；订单与报价另存成交来源和金额快照（`pricing_snapshot`），不回查当前价格改写历史。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| Price | `prices` | 价格记录；variant+market+currency 索引、price_type/amount_minor/有效窗口/规则 Json |
| PriceList | `price_lists` | 价目表（code 唯一）；市场/币种/状态 |
