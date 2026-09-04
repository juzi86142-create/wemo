# WEMOVE Web 前端

这是项目唯一的 React 前端，使用 Next.js App Router。公开官网、用户中心、经销商中心和管理后台在同一应用内使用不同路由区域，统一通过独立 Node.js API 获取数据。

```powershell
pnpm --filter @wemo/storefront dev
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront build
```

当前首页是视觉与运行基线，产品图片和正式文案尚未迁移。业务范围见 `src/features/*/README.md`，工程规则见 `AGENTS.md` 与 `src/AGENTS.md`。
