# Orders 模块

- 实现 B2C 与 B2B 两套订单状态机、订单/行项目金额与商品快照、地址、备注和历史。
- 支持人工订单、B2B 人工确认、PO/账期、拆分发货、单据、取消、调整与复购。
- 创建/确认订单时协调 Pricing、Inventory、Payments 和 Audit，拒绝非法状态跳转。
