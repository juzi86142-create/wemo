# WEMOVE UI

共享设计系统服务于同一个 Next.js 前端中的公开站、用户、经销商和后台四个区域。各子目录 README 描述组件清单和完成任务。

```powershell
pnpm --filter @wemo/ui build
pnpm --filter @wemo/ui typecheck
pnpm --filter @wemo/ui test
```

生产入口位于 `dist/index.js`；根目录 `pnpm dev` 会先构建并持续监听本包。
