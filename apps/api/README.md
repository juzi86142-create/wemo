# WEMOVE 单体 API

这是唯一 Node.js 后端进程。NestJS 模块用于代码边界，不是微服务；全部模块一起构建、启动和部署。

```powershell
pnpm --filter @wemo/api dev
pnpm --filter @wemo/api typecheck
pnpm --filter @wemo/api test
pnpm --filter @wemo/api build
```

健康检查为 `GET /api/v1/health`。各业务模块待实现任务见 `src/modules/*/README.md`。
