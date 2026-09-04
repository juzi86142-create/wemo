# 数据库包

PostgreSQL 数据模型由 Prisma schema 管理，主键统一使用 PostgreSQL 自增整数，跨表只保存整数逻辑 ID，且禁止物理外键。

```powershell
pnpm --filter @wemo/database build
pnpm check:database
pnpm --filter @wemo/database db:generate
pnpm --filter @wemo/database db:migrate
```

本地中间件连接信息见根目录 `.env.example`。
生产入口位于 `dist/index.js`；根目录 `pnpm dev` 会先构建并持续监听本包。
