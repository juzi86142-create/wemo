# Inventory 数据

- 按 Variant、仓库和市场保存 on hand、available、reserved 与同步时间（`inventory_balances`）。
- 演示模式已移除独立预占表（`inventory_reservations` 不落库）：`orders.reserveInventory` 仅软校验余额并打日志、`releaseInventory` 空实现，API `inventory` 模块的预占接口为 stub（读空/写抛「Demo模式：暂不支持库存预占」）；契约类型 InventoryReservation 保留，仅为 API 形状。
- 并发扣减使用事务条件更新/锁，不依靠外键；同步陈旧由服务层降级前台展示。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| InventoryBalance | `inventory_balances` | variant + warehouse_code + market 唯一；on_hand/available/reserved/source/synced_at |
