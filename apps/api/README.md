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

健康检查为 `GET /api/v1/health`。共 24 个领域模块（见 `src/modules/`），全部通过 typecheck，各模块实现状态与任务见 `src/modules/*/README.md` 与总览 `src/modules/README.md`。

演示模式 stub 模块：`analytics`、`cart`、`notifications`、`integrations`、`jobs`、`reports` 的对应表（分析事件/购物车/通知模板与投递/集成/作业与执行/报表、outbox 等）已从数据库 schema 移除，实现为 stub——读返回空、写抛「Demo模式：暂不支持…」；购物车由客户端状态承担，`cart.previewPricing` 仍按 `prices` 表真实计价。其余模块按 `schema.prisma` 真实落库（个别接口如库存预占、地址本仍为 stub，见模块 README）。
