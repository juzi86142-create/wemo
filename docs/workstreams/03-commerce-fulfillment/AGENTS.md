# 03 工作流 AI 约束

## 开工必读

依次读取根 `AGENTS.md`、本目录 `README.md`、目标源码路径沿途的全部 `AGENTS.md`，并逐项核对需求第 8、9 章和相关 ID。实施前画清真实 checkout/quote/payment/return 调用链、事务边界与失败补偿。

## 修改边界

- 只直接实现本工作流拥有的路径。不得复制 Catalog、Identity/Dealers 或 Integrations 的业务真相到交易模块。
- 金额跨 API 使用最小货币单位整数；订单、报价、付款和退款持久化来源与快照，历史记录只追加。
- 所有经销商查询把 02 提供的 actor 范围传入 repository 条件；库存预占、订单写入、outbox/审计必须拥有明确的原子性或可靠补偿。
- 不主动修改共享装配文件；对共享 schema 只改本领域连续模型块，不做全文件格式化。

## 验证重点

使用真实 application service 或 HTTP 并发测试验证库存不会超卖、幂等键不会生成重复订单/退款、过期报价不能转单、非法状态不能跳转、其他企业看不到订单/报价。测试 fake 必须遵守生产 adapter 的幂等和失败语义。
