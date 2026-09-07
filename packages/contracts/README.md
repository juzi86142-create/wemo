# 共享契约

前端与单体 API 通过本包共享 Zod schema 和推导类型。运行时输入必须解析 schema，不能只依赖编译期类型。

```powershell
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/contracts typecheck
pnpm --filter @wemo/contracts test
```

生产入口位于 `dist/index.js`；根目录 `pnpm dev` 会先构建并持续监听本包。

领域说明见 `src/*/README.md`（common、identity、catalog、dealers、commerce、content、platform）。契约保留完整领域形状（含 Cart/InventoryReservation/Notification/Address 等）。落库现状：核心/支撑契约数据落 PostgreSQL（`schema.prisma`）；购物车、库存预占、地址本、订阅、通知模板与投递、分析事件、集成配置、作业执行与报表定义/结果等持久化在 Redis（键前缀 `wemo:`，实现见 `apps/api` 各模块 redis repository）——契约落点以 API 模块与 `packages/database/prisma/schema.prisma` 为准。
