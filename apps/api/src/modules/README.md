# API 领域模块总览

`apps/api/src/modules` 是 Node.js/NestJS 模块化单体的领域模块目录。所有模块在同一个 API 进程内运行，不拆分微服务。

- 每个子目录只负责一个业务领域，并维护自己的 `README.md`。
- Controller 负责 HTTP 适配，应用服务负责用例编排，领域规则负责状态机与边界，基础设施负责 Prisma/Redis/对象存储/外部服务适配。
- 模块之间通过公开应用服务或领域事件协作，不直接绕过服务层修改其他模块数据。
- 所有 PostgreSQL 实体 ID 使用自增整数；Redis 持久化记录以各键空间 `:next` 计数器（`incr`）分配整数 ID。跨表只保存逻辑 ID，禁止物理外键。
- 24 个模块全部通过 `pnpm --filter @wemo/api typecheck`；PostgreSQL 落库以 `packages/database/prisma/schema.prisma` 的 30 张表为准；购物车、订阅、地址本、通知、分析事件、集成、作业、报表等非核心数据持久化在 Redis（键前缀 `wemo:`）。

## 模块清单（24）

| 模块 | 数据现状 | 说明 |
| --- | --- | --- |
| auth | PostgreSQL + Redis | `users`/`sessions`；注册/登录/会话/重置；订阅与通知投递持久化在 Redis |
| identity | PostgreSQL + Redis | `users`/`roles`/`user_roles`/`sessions`；地址本/订阅/数据请求/通知投递持久化在 Redis（`user:{id}:addresses` 等），收藏待定 |
| dealers | PostgreSQL + Redis | `dealer_companies`/`dealer_members`/`dealer_applications`；企业地址持久化在 Redis（`company:{id}:addresses`） |
| catalog | 真实落库 | `categories`/`products`/`product_translations`/`variants` |
| pricing | 真实落库 | `prices`/`price_lists`；计价优先级在服务端裁决 |
| inventory | PostgreSQL + Redis | `inventory_balances` 真实；预占记录持久化在 Redis（`inventory:reservations`），预占在 PG 事务内扣减余额 |
| cart | **Redis 持久化** | 购物车持久化在 Redis（`cart:{id}`/`cart:{id}:items`/`cart:by-user:{userId}`）；`expires_at` 为业务字段由应用层判断；`previewPricing` 按 `prices` 真实最低价 |
| orders | PostgreSQL + Redis | `orders`/`order_items`（+`audit_logs` 状态变更审计）；`reserveInventory`/`releaseInventory` 联动 Redis 预占与 PG 余额、幂等键防重 |
| payments | 真实落库 | `payments`；幂等键/回调 |
| returns | 真实落库 | `return_requests` |
| quotes | 真实落库 | `quotes`/`quote_versions`；转单 |
| cms | 真实落库 | `content_entries` |
| media | 真实落库 | `media_assets` |
| forms | 真实落库 | `form_submissions` |
| search | 组合查询 | 检索 `product_translations`/`categories`/`products`，无独立表 |
| seo | 真实落库 | `redirects` + `content_entries` 的 seo 字段 |
| localization | 真实落库 | `languages`/`markets`/`market_locales`；已具备单元/数据库/HTTP 测试 |
| settings | 真实落库 | `system_settings` |
| audit | 真实落库 | `audit_logs`；只追加 |
| notifications | **Redis 持久化** | 通知模板与投递持久化在 Redis（`notifications:templates`/`notifications:deliveries`） |
| analytics | **Redis 持久化** | 事件持久化在 Redis（`analytics:events`），按 `dedupe_key` 永久去重（`analytics:dedupe`） |
| integrations | **Redis 持久化** | 集成配置持久化在 Redis（`integrations`） |
| jobs | **Redis 持久化** | 作业运行记录持久化在 Redis（`jobs:runs`） |
| reports | **Redis 持久化** | 报表定义与结果持久化在 Redis（`reports:definitions`/`reports:results`） |

Redis 持久化规则：作为持久层的数据一律不设 TTL 到期清理，只有真正的缓存才允许过期删除；购物车 `expires_at` 是业务字段由应用层判断。各模块 Redis 键与实现见模块内 `*.redis-repository.ts`（或 hybrid 模块的 prisma repository）。
