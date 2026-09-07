# Inventory 数据

- 按 Variant、仓库和市场保存 physical/on hand、available、reserved 与同步时间。
- 预占记录通过 owner_type + owner_id 关联支付会话或订单，支持过期释放和幂等确认。
- 并发扣减使用事务条件更新/锁，不依靠外键；同步陈旧由服务层降级前台展示。
