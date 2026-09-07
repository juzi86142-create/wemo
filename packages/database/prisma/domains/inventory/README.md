# Inventory 数据

- 按 Variant、仓库和市场保存 on hand、available、reserved 与同步时间（`inventory_balances`）。
- 库存预占记录持久化在 Redis（`wemo:inventory:reservations`），余额保留在 PostgreSQL：预占在 PG 事务内校验并扣减 `inventory_balances` 余额后把预占记录写入 Redis，确认/释放同样在 PG 事务内回补余额并更新 Redis 记录；`wemo:inventory:reservations:idem:{key}` 幂等键防重复预占。契约类型 InventoryReservation 与实现一致。
- 并发扣减使用事务条件更新/锁，不依靠外键；同步陈旧由服务层降级前台展示。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| InventoryBalance | `inventory_balances` | variant + warehouse_code + market 唯一；on_hand/available/reserved/source/synced_at |
