# 共享契约

前端与单体 API 通过本包共享 Zod schema 和推导类型。运行时输入必须解析 schema，不能只依赖编译期类型。

```powershell
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/contracts typecheck
pnpm --filter @wemo/contracts test
```

生产入口位于 `dist/index.js`；根目录 `pnpm dev` 会先构建并持续监听本包。

领域说明见 `src/*/README.md`（common、identity、catalog、dealers、commerce、content、platform）。契约保留完整领域形状（含 Cart/InventoryReservation/Notification/Address 等）；演示模式下部分契约对应的表已从 `schema.prisma` 移除、API 以 stub 语义占位（读空/写抛「Demo模式：暂不支持…」）——契约是否落库以 API 模块与 `packages/database/prisma/schema.prisma` 为准。
