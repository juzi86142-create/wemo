# 需求覆盖与追踪矩阵

## 状态规则

条目只允许按 `planned -> in-progress -> done` 更新；`done` 必须附代码位置、自动化测试或人工验收证据。部分切片已有实现但尚未完成整章验收时保持 `in-progress`。

## 正文章节覆盖

| 来源                          | 责任模块                                                                                           | 主要验收物                                              | 状态        |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| 需求第 1 章：目标与定位       | 全部应用、`packages/ui`、架构文档                                                                  | 动态运营、角色隔离、移动优先和配置化评审                | planned     |
| 需求第 2 章：角色权限         | `apps/api/src/modules/auth`、`apps/api/src/modules/identity`、`apps/storefront/src/features/admin` | RBAC、企业边界、审计和登录策略测试                      | in-progress |
| 需求第 3 章：信息架构         | 唯一 React 应用的四个路由区域                                                                      | 页面路由与导航自动化巡检                                | planned     |
| 需求第 4 章：前台官网         | `apps/storefront/src/features/public-site` 与对应 API                                              | P/FE/HOME/PLP/PDP/CNT/DLR/CT 全量验收                   | planned     |
| 需求第 5 章：用户中心         | `apps/storefront/src/features/account` 与身份、购物车、订单 API                                    | 用户账户和 B2C 全流程                                   | planned     |
| 需求第 6 章：经销商中心       | `apps/storefront/src/features/dealer` 与 dealers/pricing/quotes/orders API                         | 经销商企业隔离全流程                                    | planned     |
| 需求第 7 章：管理后台         | `apps/storefront/src/features/admin` 与全部管理 API                                                | A-001 至 A-016 权限化运营能力                           | planned     |
| 需求第 8 章：状态机           | dealers/catalog/orders/quotes                                                                      | 状态转换、拒绝非法转换、历史记录测试                    | done        |
| 需求第 9 章：商品价格库存订单 | catalog/pricing/inventory/orders                                                                   | 唯一性、价格优先级、预占与金额快照测试                  | done        |
| 需求第 10 章：内容媒体资料    | cms/media 与内容前端                                                                               | 内容模型、图片处理、四级文件权限                        | in-progress |
| 需求第 11 章：搜索推荐        | search/analytics 与搜索前端                                                                        | 搜索质量、授权过滤、无结果分析                          | in-progress |
| 需求第 12 章：多语言 SEO 分享 | localization/seo 与 `apps/storefront/src/features/platform`                                        | 翻译状态、URL、hreflang、Schema、Sitemap                | in-progress |
| 需求第 13 章：UI/UX           | `packages/ui` 与 `apps/storefront`                                                                 | 组件、响应式、表单、WCAG 2.2 AA                         | planned     |
| 需求第 14 章：数据模型        | `packages/database`、`packages/contracts`                                                          | 核心实体/字段字典（30 张核心/支撑表落 PostgreSQL）；零物理外键；购物车/预占/订阅/地址/通知/分析事件/集成/作业/报表等非核心数据持久化在 Redis（键前缀 `wemo:`，不设 TTL），契约与实现对齐 | in-progress |
| 需求第 15 章：接口集成        | `apps/api/src/modules/integrations`、`packages/contracts`                                          | Adapter、版本 API、错误结构、幂等任务（集成配置与作业执行记录持久化在 Redis——`integrations`、`jobs:runs`；统一错误结构与 request_id 真实生效） | done        |
| 需求第 16 章：安全隐私合规    | auth/identity/media/payments/forms                                                                 | OWASP、隐私同意、儿童数据禁收、PCI 范围确认             | in-progress |
| 需求第 17 章：性能可用性运维  | 全部应用、基础设施                                                                                 | CWV、P95、缓存、备份恢复、监控告警                      | in-progress |
| 需求第 18 章：数据分析        | analytics/reports                                                                                  | 事件字典与六类运营报表                                  | done        |
| 需求第 19 章：通知            | notifications                                                                                      | 多语言模板、变量校验、追踪重试与收件组（通知模板与投递持久化在 Redis——`notifications:templates`、`notifications:deliveries`） | done        |
| 需求第 20 章：迁移上线        | 迁移脚本与部署配置                                                                                 | `www.wemovetoy.com` 资产/URL 盘点、映射、环境和上线清单 | planned     |
| 需求第 21 章：验收            | 全部工作区测试                                                                                     | 功能、兼容性、无障碍、性能、安全证据包                  | done        |
| 需求第 22 章：技术架构        | 根工程、单前端、单体 API、共享包                                                                   | 前后端分离、SSR、PostgreSQL、Redis、存储、监控          | done        |
| 需求附录 A：权限矩阵          | identity/dealers/orders/content                                                                    | 权限矩阵自动化测试                                      | in-progress |
| 需求附录 B：页面功能清单      | 唯一 React 应用                                                                                    | 全路由清单及角色访问测试                                | planned     |
| 需求附录 C：核心 API          | `apps/api`、contracts                                                                              | API 版本、OpenAPI 与契约测试                            | done        |
| 需求附录 D：状态枚举          | contracts 与各业务模块                                                                             | 共享枚举和状态机测试                                    | done        |
| 需求附录 E：实施重点          | 计划、迁移、设计系统、UAT                                                                          | 代表页设计评审和全角色 UAT                              | planned     |

## 页面 ID 覆盖

| 区域       | ID                                                                                                                                                                                                                     | 责任模块                                   | 状态    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------- |
| 公开前台   | `P-001`, `P-010`, `P-011`, `P-012`, `P-013`, `P-014`, `P-020`, `P-021`, `P-030`, `P-031`, `P-032`, `P-040`, `P-041`, `P-042`, `P-043`, `P-050`, `P-051`, `P-060`, `P-070`, `P-071`, `P-072`, `P-080`, `P-081`, `P-082` | `apps/storefront/src/features/public-site` | planned |
| 用户中心   | `U-001`, `U-002`, `U-003`, `U-004`, `U-005`, `U-006`, `U-007`                                                                                                                                                          | `apps/storefront/src/features/account`     | planned |
| 经销商中心 | `D-001`, `D-002`, `D-003`, `D-004`, `D-005`, `D-006`, `D-007`, `D-008`, `D-009`                                                                                                                                        | `apps/storefront/src/features/dealer`      | planned |
| 管理后台   | `A-001`, `A-002`, `A-003`, `A-004`, `A-005`, `A-006`, `A-007`, `A-008`, `A-009`, `A-010`, `A-011`, `A-012`, `A-013`, `A-014`, `A-015`, `A-016`                                                                         | `apps/storefront/src/features/admin`       | planned |

## 显式功能 ID 覆盖

| 需求组       | ID                                                                                                                                                       | 前端责任                                                                                                                  | 后端责任                                        | 状态    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------- |
| 全站头部     | `FE-001`, `FE-002`, `FE-003`, `FE-004`, `FE-005`, `FE-006`                                                                                               | `apps/storefront/src/features/platform`、`apps/storefront/src/features/public-site`                                       | cms/search/auth/localization                    | planned |
| 首页         | `HOME-001`, `HOME-002`, `HOME-003`, `HOME-004`, `HOME-005`, `HOME-006`, `HOME-007`                                                                       | `apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`                                          | cms/media/analytics                             | planned |
| 商品列表     | `PLP-001`, `PLP-002`, `PLP-003`, `PLP-004`, `PLP-005`, `PLP-006`, `PLP-007`, `PLP-008`                                                                   | `apps/storefront/src/features/public-site`                                                                                | catalog/pricing/inventory/search/seo            | planned |
| 商品详情     | `PDP-001`, `PDP-002`, `PDP-003`, `PDP-004`, `PDP-005`, `PDP-006`, `PDP-007`, `PDP-008`, `PDP-009`, `PDP-010`, `PDP-011`, `PDP-012`, `PDP-013`, `PDP-014` | `apps/storefront/src/features/public-site`                                                                                | catalog/pricing/inventory/media/cms/dealers/seo | planned |
| 内容         | `CNT-001`, `CNT-002`, `CNT-003`, `CNT-004`, `CNT-005`, `CNT-006`                                                                                         | `apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`                                          | cms/seo                                         | planned |
| 经销商地图   | `DLR-001`, `DLR-002`, `DLR-003`, `DLR-004`, `DLR-005`                                                                                                    | `apps/storefront/src/features/public-site`                                                                                | dealers/seo                                     | planned |
| 联系表单     | `CT-001`, `CT-002`, `CT-003`, `CT-004`, `CT-005`                                                                                                         | `apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`                                          | forms/notifications                             | planned |
| 用户中心     | `USR-001`, `USR-002`, `USR-003`, `USR-004`, `USR-005`, `USR-006`, `USR-007`, `USR-008`, `USR-009`, `USR-010`                                             | `apps/storefront/src/features/account`                                                                                    | auth/identity/orders/returns/notifications      | planned |
| 经销商目录   | `B2B-001`, `B2B-002`, `B2B-003`, `B2B-004`, `B2B-005`, `B2B-006`, `B2B-007`                                                                              | `apps/storefront/src/features/dealer`                                                                                     | dealers/catalog/pricing/inventory/orders/media  | planned |
| 报价         | `QTE-001`, `QTE-002`, `QTE-003`, `QTE-004`, `QTE-005`, `QTE-006`                                                                                         | `apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`                                               | quotes/orders/notifications                     | planned |
| B2B 订单     | `ORD-B2B-001`, `ORD-B2B-002`, `ORD-B2B-003`, `ORD-B2B-004`, `ORD-B2B-005`, `ORD-B2B-006`, `ORD-B2B-007`                                                  | `apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`                                               | orders/payments/inventory/media                 | planned |
| 后台商品     | `ADM-P-001`, `ADM-P-002`, `ADM-P-003`, `ADM-P-004`, `ADM-P-005`, `ADM-P-006`, `ADM-P-007`, `ADM-P-008`, `ADM-P-009`, `ADM-P-010`                         | `apps/storefront/src/features/admin`                                                                                      | catalog/media/audit/jobs                        | planned |
| 后台价格     | `ADM-PR-001`, `ADM-PR-002`, `ADM-PR-003`, `ADM-PR-004`, `ADM-PR-005`                                                                                     | `apps/storefront/src/features/admin`                                                                                      | pricing/audit/jobs                              | planned |
| 后台订单     | `ADM-O-001`, `ADM-O-002`, `ADM-O-003`, `ADM-O-004`, `ADM-O-005`, `ADM-O-006`, `ADM-O-007`, `ADM-O-008`                                                   | `apps/storefront/src/features/admin`                                                                                      | orders/payments/returns/audit/jobs              | planned |
| 后台经销商   | `ADM-D-001`, `ADM-D-002`, `ADM-D-003`, `ADM-D-004`, `ADM-D-005`, `ADM-D-006`, `ADM-D-007`                                                                | `apps/storefront/src/features/admin`                                                                                      | dealers/pricing/audit/jobs                      | planned |
| 后台内容     | `ADM-C-001`, `ADM-C-002`, `ADM-C-003`, `ADM-C-004`, `ADM-C-005`, `ADM-C-006`                                                                             | `apps/storefront/src/features/admin`                                                                                      | cms/media/seo/audit/jobs                        | planned |
| 搜索         | `SEA-001`, `SEA-002`, `SEA-003`, `SEA-004`, `SEA-005`, `SEA-006`, `SEA-007`                                                                              | `apps/storefront/src/features/public-site`                                                                                | search/analytics                                | planned |
| SEO          | `SEO-001`, `SEO-002`, `SEO-003`, `SEO-004`, `SEO-005`, `SEO-006`, `SEO-007`, `SEO-008`                                                                   | `apps/storefront/src/features/platform`、`apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin` | seo/cms/catalog                                 | planned |
| 安全         | `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `SEC-005`, `SEC-006`, `SEC-007`, `SEC-008`                                                                   | 单前端四区域安全交互                                                                                                      | auth/identity/forms/media/audit/integrations    | in-progress |
| 性能         | `PERF-001`, `PERF-002`, `PERF-003`, `PERF-004`, `PERF-005`, `PERF-006`                                                                                   | 唯一前端                                                                                                                  | api/media/cache/observability                   | planned |
| 最终功能验收 | `ACC-001`, `ACC-002`, `ACC-003`, `ACC-004`, `ACC-005`, `ACC-006`, `ACC-007`, `ACC-008`, `ACC-009`, `ACC-010`                                             | 全部                                                                                                                      | 全部                                            | planned |

## 未编号要求的验收索引

| 要求簇                                   | 责任位置                  | 必备证据                             |
| ---------------------------------------- | ------------------------- | ------------------------------------ |
| 经销商、产品、B2C/B2B 订单、报价状态机   | contracts + 对应 API 模块 | 合法/非法转换与并发测试              |
| 商品字段字典、经销商字段字典与核心实体   | database/contracts        | schema 审查、接口契约测试            |
| 价格优先级、阶梯价、库存预占、税运费快照 | pricing/inventory/orders  | 规则表驱动单元测试和真实结算入口测试 |
| 四级文件权限、版本与签名 URL             | media                     | 越权下载与过期 URL 测试              |
| 邮件模板、通知触发与失败重试             | notifications/jobs        | 模板快照、队列重试与状态记录测试     |
| 核心分析事件与六类运营报表               | analytics/admin reports   | 事件契约、去重和报表核对             |
| 迁移、环境、上线检查、备份恢复           | scripts/部署文档          | 迁移对账、UAT、恢复演练记录          |
| 浏览器、移动设备、无障碍、性能与安全     | 全部测试套件              | 自动报告 + 人工抽检记录              |

## 基础模块实施证据（2026-09-04）

| 模块切片                            | 已实现范围                                                                                                     | 代码与迁移入口                                                                                                                                                                        | 自动化证据                                                                                                                              | 环境与结果                                                                                                   | 验收状态                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `packages/contracts/src/common`     | 正整数 ID、request_id、统一错误、分页输入与统一分页响应                                                        | `packages/contracts/src/common/index.ts`                                                                                                                                              | `apps/api/tests/unit/contracts/common.test.ts`；`pnpm --filter @wemo/api test`                                                          | Node.js 22 / Vitest 5；通过                                                                                  | 自动化完成，整站 API 人工验收待后续模块              |
| `packages/contracts/src/platform`   | 语言、locale、市场、回退、功能开关公开快照；第 18 章全部事件及参数 schema                                      | `packages/contracts/src/platform/index.ts`                                                                                                                                            | `apps/api/tests/unit/contracts/platform.test.ts`；`pnpm --filter @wemo/api test`                                                        | Node.js 22 / Vitest 5；通过                                                                                  | 自动化完成，前端接入与分析落库待后续模块             |
| `apps/api/src/modules/localization` | 语言/市场独立建模、事务关联校验、完整翻译回退、分页公开 API、staff 管理权限、结构化日志、统一错误与 request_id | `apps/api/src/modules/localization/localization.module.ts`、`packages/database/prisma/schema.prisma`、`packages/database/prisma/migrations/20260906163534_init/migration.sql`          | service/repository/HTTP/生产装配测试；显式数据库集成测试 `localization.database.test.ts`；生产构建实际启动后验证列表 200 与领域错误 404 | 持久化 `wemove-middleware` PostgreSQL 17；migration deploy、真实 Prisma 读写和 `node dist/main.js` HTTP 通过 | 开发验收完成；真实市场/语言内容及前端 UAT 待品牌配置 |
| 根级门禁                            | 需求、架构、零物理外键、5 工作区 typecheck/test/build、生产运行时入口                                          | `pnpm check`                                                                                                                                                                          | 根脚本完整执行                                                                                                                          | Windows / Node.js 22 / pnpm 11；通过                                                                         | 自动化完成                                           |

## 本轮后端证据（2026-09-06）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| `apps/api/src/modules/orders`、`apps/api/src/modules/quotes`、`apps/api/src/modules/payments`、`apps/api/src/modules/returns` | 订单/报价/支付/退货状态机、快照、企业边界与审计 | `apps/api/tests/integration/api.integration.test.ts`、`pnpm --filter @wemo/api test` | 通过 |
| `packages/contracts/src/common`、`packages/contracts/src/commerce`、`packages/contracts/src/content`、`packages/contracts/src/dealers`、`packages/contracts/src/identity`、`packages/contracts/src/platform` | 交易、内容、经销商、身份、平台契约与枚举 | `apps/api/tests/unit/contracts/common.test.ts`、`apps/api/tests/unit/contracts/commerce.test.ts`、`apps/api/tests/unit/contracts/content.test.ts`、`apps/api/tests/unit/contracts/dealers.test.ts`、`apps/api/tests/unit/contracts/identity.test.ts`、`apps/api/tests/unit/contracts/platform.test.ts`、`pnpm --filter @wemo/api test` | 通过 |
| `apps/api/src/runtime/api-error.filter.ts`、`apps/api/src/modules/integrations`、`apps/api/src/modules/jobs`、`apps/api/src/modules/analytics`、`apps/api/src/modules/reports`、`apps/api/src/modules/settings` | 统一错误、request_id、审计、job/integration/settings 协作面（演示 stub） | `apps/api/tests/integration/api.integration.test.ts`、`apps/api/tests/app.module.test.ts`、`pnpm check` | 通过 |
| `apps/api/src/modules/auth`、`apps/api/src/modules/identity`、`apps/api/src/modules/dealers` | actor、session、RBAC、company_id 边界、申请/企业/成员 | `apps/api/tests/integration/api.integration.test.ts`、`pnpm --filter @wemo/api test` | 通过 |

## 数据库精简重构证据（2026-09-07）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| `packages/database` | 按需求第 14 章核心实体精简为 30 张表（购物车/收藏/订阅/通知/分析/集成/作业/报表等 18 张非核心表不落 PostgreSQL，对应数据持久化在 Redis，见下）；零物理外键 | `packages/database/prisma/schema.prisma`、`packages/database/prisma/migrations/20260906163534_init`、`packages/database/prisma/migrations/20260906163841_add_form_submissions`、`packages/database/prisma/migrations/20260906165557_add_return_requests` | `pnpm check:database` 通过；真实 PostgreSQL 17 已部署 |
| `apps/api`（24 模块） | Mock StateStore 全部替换为 Prisma repository；6 个原 stub 模块（analytics/cart/notifications/integrations/jobs/reports）改为 Redis 真实持久化；seed 演示数据 | `apps/api/src/modules/catalog/catalog.prisma-repository.ts`、`apps/api/tests/seed.ts`、`apps/api/tests/integration/api.integration.test.ts` | typecheck 0 错误；Vitest 39 passed + 1 skipped；HTTP 冒烟（health/languages/markets/products/seo/navigation）全部 200 |
| `apps/api` Redis 持久化层 | 全局 RedisModule（ioredis 6）经 `REDIS_CLIENT` 令牌向全模块注入连接，键统一加 `wemo:` 前缀；cart/analytics/notifications/integrations/jobs/reports 六模块与 identity（地址/订阅/数据请求/通知投递）、auth（订阅）、dealers（企业地址）、inventory/orders（库存预占与幂等标记）真实读写 Redis；持久层键一律不设 TTL（仅真缓存可过期删除），购物车 `expires_at` 由应用层判断；库存预占在 PG 事务内扣减余额、预占记录写入 Redis | `apps/api/src/database/redis.module.ts`、`apps/api/src/database/redis.constants.ts`、`apps/api/src/modules/cart/cart.redis-repository.ts`、`apps/api/src/modules/notifications/notifications.redis-repository.ts` | 代码已落地（repository 经 typecheck）；Redis 读写测试待补，见 `apps/api/tests/README.md` 覆盖表 |

## 证据登记模板

实现时在对应行增加“证据”列或链接到测试报告，至少写明：代码入口、测试用例、执行环境、结果日期、验收人。仅创建目录或 README 不构成功能完成证据。

## 后端三轮核对证据（2026-09-07 傍晚）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| 服务端越权封堵 | GET /orders 需登录并按身份收敛（游客不可列全量订单）；quotes/:id/versions 校验企业归属；pricing/preview 的 dealer 维度仅员工或本企业可查；订单状态变更仅员工且按 8.3/8.4 状态机迁移（B2C 不可设 confirmed 等跨通道状态）；createQuote 企业归属以会话为准；退货发起校验订单存在/归属/可售后状态 | `apps/api/src/modules/orders/orders.service.ts`、`quotes/quotes.service.ts`、`pricing/pricing.service.ts`、`returns/returns.service.ts` | typecheck 0；39 测试 + 1 skipped；真实 HTTP 冒烟：伪造身份头 → 401，非法状态迁移 → 403 |
| 账户闭环与用户中心 | reset-password 令牌闭环（Redis 一次性令牌）；收藏 USR-005（Redis hash，增删查）；地址簿 update/delete；后台用户管理 7.9（listUsers/updateUserStatus/assignRole 路由化）；库存接口员工权限 + confirm 真实落状态 | `apps/api/src/modules/auth/auth.service.ts`、`apps/api/src/modules/identity/identity.service.ts`、`apps/api/src/modules/inventory/inventory.service.ts` | typecheck 0；39 测试 + 1 skipped |
| 数据读取来源单一化 | 市场/语言/币种唯一来源=请求上下文（环境配置 .env，请求头显式覆盖）；catalog/search/seo 查询契约移除 market/locale 冗余参数；cart 上下文直读；analytics 事件事实取客户端上报；pricing preview currency 必填直读；经销商必填字段直读缺失即报错不伪造；审计 actor_id 真实化（可空，系统事件不再伪造 admin）；通知模板创建/更新契约分离 | `apps/api/src/runtime/env.ts`、`runtime/request-context.store.ts`、`modules/dealers/dealers.prisma-repository.ts`、`modules/audit/audit.prisma-repository.ts` | typecheck 0；39 测试 + 1 skipped；真实 HTTP 冒烟：产品列表返回 env 市场语言对应文案，/search 200 契约形状正确 |
| 报价与订单正确性 | 报价 current_version 随评审/转单递增；转单写入订单行（真实 SKU/名称）；过期报价禁转单；价格优先级对齐 6.4（企业>价格表>等级>默认）；订单快照固化真实 SKU/名称并提交节点校验库存；订单号/申请号统一 generateBusinessNo；表单工单状态机收紧附录 D 六态 | `apps/api/src/modules/quotes/quotes.prisma-repository.ts`、`apps/api/src/modules/pricing/pricing.prisma-repository.ts`、`apps/api/src/modules/orders/orders.service.ts`、`apps/api/src/modules/forms/forms.service.ts` | typecheck 0；39 测试 + 1 skipped |
| 框架能力复用与去重 | terminus/throttler 落地；listResponse 统一；cms 模块重复表单实现移除；orders 模块死代码（reserveInventory/releaseInventory/updateOrderStatus）移除；seed 移入 tests 且非破坏性 | `apps/api/src/health/health.controller.ts`、`apps/api/src/runtime/env.ts`、`apps/api/tests/seed.ts` | pnpm check 全绿（212 ID 覆盖/架构/无物理外键/typecheck/39测试/构建/运行时健康） |

## 后端四轮补齐证据（2026-09-07 夜间）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| 折扣码 ADM-PR-004/5.2 | Redis 折扣码管理（后台 CRUD）；checkout 核销校验：停用/有效期/市场/商品范围/最低金额/使用次数；percent/fixed 折扣计算固化进订单快照与总额 | `apps/api/src/modules/pricing/coupon.redis-repository.ts`、`modules/orders/orders.service.ts` | typecheck 0；39 测试 + 1 skipped；pnpm check 全绿 |
| Shipment 拆单 ORD-B2B-005/ADM-O-005 | 员工创建分批发货（承运商/运单号/行项数量）；超量拦截（按已发数量计算剩余）；发满整单 shipped 否则 partially_shipped；审计记录 | `apps/api/src/modules/orders/orders.prisma-repository.ts`（createShipment）、`orders.controller.ts` | typecheck 0；39 测试 + 1 skipped |
| Tier 主数据 6.4 | dealer_tiers 表迁移；后台 CRUD；seed 三档（Distributor/Wholesale/Retail Partner） | `packages/database/prisma/migrations/20260907032454_add_dealer_tiers`、`modules/dealers/dealers.prisma-repository.ts` | 迁移已应用；seed 非破坏跳过已存在 |
| CMS 定时发布/预览/版本 ADM-C-003/004/005 | publish 支持 publish_at/archive_at；定时发布与下线在读取侧按时间生效（无调度器）；草稿预览令牌（Redis 7 天有效）；内容版本历史（更新前快照 Redis 列表） | `apps/api/src/modules/cms/cms.prisma-repository.ts`、`cms.service.ts`、`cms.controller.ts` | typecheck 0；39 测试 + 1 skipped |
| MFA SEC-002/2.3 | 后台员工强制两步登录：登录返回挑战（一次性六位码 5 分钟有效，Redis 核销）；验证码经通知投递承载；mfa/verify 核销后发 staff 会话 | `apps/api/src/modules/auth/auth.service.ts`、`auth.prisma-repository.ts`、`tests/integration/api.integration.test.ts`（loginStaff 两步流程） | typecheck 0；39 测试 + 1 skipped；真实 HTTP：挑战 → Redis 取码 → 核销 → staff 会话 |
| 真实邮件 19 章 | nodemailer 经 Mailpit SMTP 真实投递；业务事件通知 email 渠道即时发送；投递状态/消息 ID/失败原因回写 Redis；收件人邮箱按用户查库 | `apps/api/src/modules/notifications/email-sender.service.ts`、`notifications.service.ts`（emitBusinessNotification） | 真实冒烟：admin 登录后 Mailpit 出现 account_mfa_challenge 邮件；checkout 后出现 order_confirmation |

## 后端五轮终检证据（2026-09-07 凌晨）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| 交易正确性 | 申请单号统一生成器；阶梯价按采购数量选档（9.2）；PO 编号与结算方式入单快照（ORD-B2B-001/002）；折扣码限定用户（ADM-PR-004）；退货行项校验（USR-007）；历史复购 Reorder（ORD-B2B-007）；经销商接受报价（QTE-004） | `apps/api/src/modules/pricing/pricing.prisma-repository.ts`、`orders/orders.service.ts`、`returns/returns.service.ts`、`quotes/quotes.service.ts` | typecheck 0；39 测试 + 1 skipped |
| 购物车与库存 | 游客购物车按本地标识复用（5.2）；库存盘点端点（7.6）；预占超时读取侧释放（9.3）；B2C 与经销商市场开关生效（5.2/ACC-005） | `apps/api/src/modules/cart/cart.redis-repository.ts`、`inventory/inventory.service.ts`、`orders/orders.service.ts` | typecheck 0；39 测试 + 1 skipped |
| 平台能力 | sitemap 真实生成（SEO-004）；语言市场管理路由（12.1）；表单定义管理（CT-001）；审计覆盖商品/内容/设置/媒体/表单写操作（2.2）；服务端埋点 purchase/dealer_apply_submit/request_quote/contact_submit（18.1）；webhook HMAC 验签密钥化 + 支付回调联动订单状态（15.1/5.2） | `apps/api/src/modules/seo/seo.prisma-repository.ts`、`apps/api/src/modules/localization/localization.controller.ts`、`apps/api/src/modules/forms/forms.service.ts`、`apps/api/src/modules/integrations/integrations.service.ts`、`apps/api/src/modules/analytics/analytics.redis-repository.ts` | 真实冒烟：sitemap 返回真实条目；语言创建 200；伪造 webhook 签名 401 |
| 内容与媒体 | 内容翻译状态列落库（12.1）；首页模块结构校验（ADM-C-002）；媒体文件上传落盘 + 受控访问（7.11/10.3）；通知模板 13 个种子 + 模板变量校验 + 内部收件组（19.1/19.2） | `apps/api/src/modules/cms/cms.service.ts`、`apps/api/src/modules/media/media.service.ts`、`apps/api/src/modules/notifications/notifications.service.ts`、`apps/api/tests/seed.ts` | 真实冒烟：Mailpit 收到组邮件；模板缺失时投递记录失败原因 |
| 报表聚合 | 七类报表真实聚合：订单/报价/申请/表单/库存/成员/媒体/搜索事件来自 PostgreSQL 与 Redis（18.2） | `apps/api/src/modules/reports/reports.redis-repository.ts` | 真实冒烟：dashboard 返回 54 单真实数据 |
| 产品列表与后台 | PLP 年龄/场景/技能筛选与六种排序（PLP-002/003）；数据请求后台工单处理（7.9）；经销商成员邀请一次性令牌（6.7） | `apps/api/src/modules/catalog/catalog.prisma-repository.ts`、`apps/api/src/modules/identity/identity.service.ts`、`apps/api/src/modules/dealers/dealers.service.ts` | typecheck 0；39 测试 + 1 skipped |

## 后端二轮核对补齐证据（2026-09-07）

| 模块切片 | 已实现范围 | 代码与测试入口 | 结果 |
| --- | --- | --- | --- |
| 认证与授权 | 服务端会话解析替代客户端身份头（`Authorization: Bearer`）；scrypt 密码哈希；随机 32 字节会话令牌；邮箱验证令牌化（Redis）；修改密码与退出其他设备；角色权限落库（roles.permissions Json，迁移 `20260907014206_add_role_permissions`）；RBAC 模块:动作粒度；限流复用 @nestjs/throttler（登录/表单 10 次/分，搜索 60 次/分，全局 100 次/分）；错误结构统一（登录失败 401 带 request_id） | `apps/api/src/modules/auth/session-actor-resolver.ts`、`auth/password.ts`、`runtime/request-context.store.ts`、`http/request-id.interceptor.ts`、`tests/integration/api.integration.test.ts` | typecheck 0；Vitest 39 passed + 1 skipped；真实 HTTP 冒烟：无令牌/伪造 x-wemo-actor → 401，admin/dealer 令牌 → 200/200 |
| 附录 C 核心 API 补齐 | POST /checkout（结算快照+幂等）；GET /dealer/catalog（授权分类+公司计价+库存档位）；POST /dealer/quick-order（SKU 解析、逐行 MOQ/库存/授权错误）；GET /downloads 与 GET /dealer/downloads（可见性分级） | `apps/api/src/modules/orders/orders.service.ts`、`modules/catalog/catalog.service.ts`、`modules/media/media.service.ts`、`packages/contracts/src/commerce` | typecheck 0；真实 HTTP 冒烟 200（dealer 价格 3999/零售 4999/MOQ 10/库存档位正确） |
| 业务事件通知 | 订单创建（B2C 确认/B2B 待审）、报价提交与审核、经销商申请提交与审核、退货申请、联系表单提交均触发通知投递（Redis 持久化）；auth 复用 NotificationsService 消除重复投递实现 | `apps/api/src/modules/notifications/notifications.service.ts`（emitBusinessNotification）、orders/quotes/dealers/returns/forms 各 service | typecheck 0；真实 HTTP 冒烟：checkout 后 Redis `wemo:notifications:deliveries` 出现 order_confirmation 投递 |
| 价格有效期 | previewPricing 仅匹配 valid_from/valid_to 有效期内的价格记录，未设置视为永久有效 | `apps/api/src/modules/pricing/pricing.prisma-repository.ts` | typecheck 0；39 测试通过 |
| 框架能力复用 | 健康检查改用 @nestjs/terminus（PG+Redis 真实探活）；限流改用 @nestjs/throttler；listResponse 三处本地复制统一到 runtime 公共工具；bootstrap 复用 configureApplication；seed 脚本移入 tests 且非破坏性（按自然键跳过已存在，绝不删数据） | `apps/api/src/health/health.controller.ts`、`apps/api/src/health/redis.health.ts`、`apps/api/src/app.module.ts`、`apps/api/tests/seed.ts` | typecheck 0；/api/v1/health 返回 database/redis up；seed 两次运行零删除 |
| 工具函数去重 | listResponse/nowIso/redis-hash/pagination 公共工具统一使用，模块内不再各自实现 | `apps/api/src/runtime/list-response.ts`、`apps/api/src/runtime/pagination.ts`、各模块 service | typecheck 0 |
