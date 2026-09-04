# WEMOVE 单体 API

这是唯一 Node.js 后端进程。NestJS 模块用于代码边界，不是微服务；全部模块一起构建、启动和部署。

```powershell
pnpm build:packages
pnpm --filter @wemo/api dev
pnpm --filter @wemo/api typecheck
pnpm --filter @wemo/api test
pnpm --filter @wemo/api build
```

从干净工作区单独启动 API 前先构建共享包；日常全栈开发优先在仓库根目录运行 `pnpm dev`。
API 的开发监听与生产构建都通过 tsup 编译，并从 `tsconfig.json` 读取 NestJS 依赖注入所需的装饰器元数据配置。

健康检查为 `GET /api/v1/health`。各业务模块待实现任务见 `src/modules/*/README.md`。
