# 共享契约

前端与单体 API 通过本包共享 Zod schema 和推导类型。运行时输入必须解析 schema，不能只依赖编译期类型。

```powershell
pnpm --filter @wemo/contracts typecheck
pnpm --filter @wemo/contracts test
```
