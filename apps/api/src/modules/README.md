# API 领域模块总览

`apps/api/src/modules` 是 Node.js/NestJS 模块化单体的领域模块目录。所有模块在同一个 API 进程内运行，不拆分微服务。

- 每个子目录只负责一个业务领域，并维护自己的 `README.md`。
- Controller 负责 HTTP 适配，应用服务负责用例编排，领域规则负责状态机与边界，基础设施负责 Prisma/Redis/对象存储/外部服务适配。
- 模块之间通过公开应用服务或领域事件协作，不直接绕过服务层修改其他模块数据。
- 所有实体 ID 使用 PostgreSQL 自增整数；跨表只保存逻辑 ID，禁止物理外键。
- 24 个模块全部通过 `pnpm --filter @wemo/api typecheck`；持久化现状以 `packages/database/prisma/schema.prisma` 的 30 张表为准。

## 模块清单（24）

| 模块 | 数据现状 | 说明 |
| --- | --- | --- |
| auth | 真实落库 | `users`/`sessions`；注册/登录/会话/重置 |
| identity | 混合 | `users`/`roles`/`user_roles`/`sessions`；地址本/订阅/通知/数据工单为 stub（表已移除） |
| dealers | 混合 | `dealer_companies`/`dealer_members`/`dealer_applications`；企业地址 stub |
| catalog | 真实落库 | `categories`/`products`/`product_translations`/`variants` |
| pricing | 真实落库 | `prices`/`price_lists`；计价优先级在服务端裁决 |
| inventory | 混合 | `inventory_balances` 真实；预占（`inventory_reservations` 表已移除）为 stub |
| cart | **演示 stub** | `carts`/`cart_items` 表已移除，读空/写抛错，购物车由客户端状态承担；`previewPricing` 例外，按 `prices` 真实最低价 |
| orders | 真实落库 | `orders`/`order_items`（+`audit_logs` 状态变更审计）；`reserveInventory`/`releaseInventory` 为软实现不落库 |
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
| notifications | **演示 stub** | `notification_templates`/`notification_deliveries` 表已移除；投递以合成对象+日志占位 |
| analytics | **演示 stub** | `analytics_events` 表已移除；事件只打日志、查询返回空 |
| integrations | **演示 stub** | `integrations` 表已移除；list 空、create/update/test 抛错 |
| jobs | **演示 stub** | `job_definitions`/`job_executions`/outbox 表已移除；definition 空/执行抛错 |
| reports | **演示 stub** | `report_definitions`/`report_results` 表已移除；定义空、运行抛错 |

演示 stub 语义：读返回空值/空分页，写抛「Demo模式：暂不支持…」（个别接口为空实现或合成对象占位，详见各模块 README）。
