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
# API 测试与运行

API 生产 repository 只使用 Prisma/PostgreSQL。普通测试不依赖数据库；三组 HTTP 集成测试和本地化 PostgreSQL 集成测试只在显式启用时执行，避免清空普通开发库：

```powershell
$env:RUN_DATABASE_INTEGRATION = "1"
$env:TEST_DATABASE_URL = "postgresql://wemove:wemove@localhost:5432/wemove_test"
pnpm --filter @wemo/database exec prisma migrate deploy
pnpm --filter @wemo/api test
```

`integration-database.fixture.ts` 会在该专用数据库中清理并写入测试数据；生产代码不会加载这些 fixture。
