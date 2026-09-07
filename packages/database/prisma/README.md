# Prisma 数据模型

- `schema.prisma` 是 PostgreSQL 数据模型的唯一声明入口，所有实体主键使用 `Int @default(autoincrement())`。
- 跨表字段使用整数逻辑 ID（如 `user_id`、`company_id`、`order_id`），不声明 `@relation`，避免生成数据库物理外键。
- `relationMode = "prisma"` 仅用于让 Prisma 在应用层处理逻辑关联；存在性、企业边界、状态和归档限制由 API 事务服务检查。
- 生成客户端使用 `pnpm --filter @wemo/database db:generate`；正式迁移前必须运行 `pnpm check:database` 并审查 SQL。
