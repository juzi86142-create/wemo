# Platform 数据

- `languages`/`markets`/`market_locales` 将语言、locale 与市场分开建模，逻辑 ID 由本地化服务在事务内校验；`system_settings` 存分组配置，`audit_logs` 存审计，`redirects` 存 SEO 跳转。
- 演示模式已移除可靠 outbox 表：异步通知、索引、作业与 Webhook 不再有落库队列（analytics/notifications/integrations/jobs/reports 模块为 stub），`audit_logs` 仍与业务写入同事务。
- 设置只保存公开配置或密钥引用，不保存可回传前端的明文密钥；审计只追加。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| Language | `languages` | 语言定义（code 唯一）；label/native_label/status |
| Market | `markets` | 市场（code 唯一）；默认 locale/币种/时区/settings Json |
| MarketLocale | `market_locales` | 市场-语言 locale 关联；path_prefix/is_default/sort_order |
| SystemSetting | `system_settings` | 系统设置（group_name+key 唯一）；value Json/version |
| AuditLog | `audit_logs` | 审计日志（entity+entityId+actor 索引）；before/after Json |
| Redirect | `redirects` | 301/302 跳转（source_path 唯一） |
