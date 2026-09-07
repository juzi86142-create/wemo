# 共享契约

前端与单体 API 通过本包共享 Zod schema 和推导类型。运行时输入必须解析 schema，不能只依赖编译期类型。

```powershell
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/contracts typecheck
pnpm --filter @wemo/contracts test
```

生产入口位于 `dist/index.js`；根目录 `pnpm dev` 会先构建并持续监听本包。
