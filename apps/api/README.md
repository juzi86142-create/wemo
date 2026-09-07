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

Redis 持久化：`analytics`、`cart`、`notifications`、`integrations`、`jobs`、`reports` 六个模块的业务数据（分析事件、购物车、通知模板与投递、集成配置、作业执行记录、报表定义与结果）持久化在 Redis——连接由全局 RedisModule（ioredis）以 `REDIS_CLIENT` 令牌向所有模块注入（见 `src/database/redis.module.ts`），键统一加 `wemo:` 前缀：`cart:{id}`/`cart:{id}:items`/`cart:by-user:{userId}`、`analytics:events`/`analytics:dedupe`、`notifications:templates`/`notifications:deliveries`、`jobs:runs`、`integrations`、`reports:definitions`/`reports:results`。identity/auth 的订阅与通知投递、identity 的地址本与数据请求（`user:{id}:subscriptions`、`user:{id}:addresses`、`user:{id}:data-requests`）、dealers 的企业地址（`company:{id}:addresses`）、inventory/orders 的库存预占与幂等标记（`inventory:reservations`）同样持久化在 Redis。

持久化规则：Redis 作为持久层的数据一律不设 TTL 到期清理，只有真正的缓存才允许过期删除；购物车 `expires_at` 是业务字段，由应用层判断。PostgreSQL 承担 30 张核心表、表单提交与库存余额——库存预占在 PG 事务内校验并扣减余额，预占记录写入 Redis。`cart.previewPricing` 按 `prices` 表真实计价，其余模块按 `schema.prisma` 真实落库。
