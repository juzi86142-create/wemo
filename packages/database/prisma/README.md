# Prisma 数据模型

- `schema.prisma` 是 PostgreSQL 数据模型的唯一声明入口，所有实体主键使用 `Int @default(autoincrement())`。
- 跨表字段使用整数逻辑 ID（如 `user_id`、`company_id`、`order_id`），不声明 `@relation`，避免生成数据库物理外键。
- `relationMode = "prisma"` 仅用于让 Prisma 在应用层处理逻辑关联；存在性、企业边界、状态和归档限制由 API 事务服务检查。
- 生成客户端使用 `pnpm --filter @wemo/database db:generate`；正式迁移前必须运行 `pnpm check:database` 并审查 SQL。
- 演示模式范围：非核心表（购物车/行、库存预占、通知模板与投递、分析事件、集成、作业、报表、outbox、订阅、地址本、收藏等）已从 schema 移除；对应 API 模块为 stub（读返回空、写抛「Demo模式：暂不支持…」），购物车等由客户端状态承担。表内数量以本文件与 `domains/*/README.md` 清单为准。

## 域目录（共 8 个，见 `domains/*/README.md`）

| 域 | @@map 表数 | 表名 |
| --- | --- | --- |
| identity | 4 | `users` `roles` `user_roles` `sessions` |
| dealers | 3 | `dealer_companies` `dealer_members` `dealer_applications` |
| catalog | 4 | `categories` `products` `product_translations` `variants` |
| commerce | 7 | `orders` `order_items` `quotes` `quote_versions` `payments` `shipments` `return_requests` |
| content | 3 | `content_entries` `media_assets` `form_submissions` |
| inventory | 1 | `inventory_balances` |
| pricing | 2 | `prices` `price_lists` |
| platform | 6 | `languages` `markets` `market_locales` `system_settings` `audit_logs` `redirects` |
