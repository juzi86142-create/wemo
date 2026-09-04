# 技术架构基线

## 架构结论

系统采用 pnpm + Turborepo 管理的 TypeScript monorepo。运行时保持前后端分离：唯一 React 应用只通过版本化 HTTP API 与单体 Node.js 后端通信，数据库不暴露给前端。

| 层 | 选型 | 说明 |
| --- | --- | --- |
| Web 前端 | Next.js + React | 一个应用承载公开官网、用户中心、经销商中心和管理后台；公开页 SSR，登录区按路由分壳 |
| API | NestJS + Fastify | 模块化单体，统一鉴权、业务规则、事务和 OpenAPI |
| 数据 | PostgreSQL + Prisma | 主键使用自增整数；只建逻辑关联，不建物理外键 |
| 缓存与异步任务 | Redis | 缓存、限流、库存预占、邮件/索引/Webhook 任务 |
| 文件 | S3 兼容对象存储 | 公开资源/CDN 与私有签名 URL 分离 |
| 搜索 | Adapter 接口 | 初期可用 PostgreSQL 搜索，规模增长后接 OpenSearch/Algolia |
| 外部系统 | Adapter 接口 | 支付、邮件、ERP/WMS、税务、物流、CRM、分析均隔离供应商 SDK |

后端只部署一个 Node.js 模块化单体，不拆分任何微服务。Docker 仅编排本地开发中间件；前端与 API 在宿主机运行，测试和生产环境通过环境变量连接各自的托管或已部署中间件。

## 应用边界

- `storefront`：唯一前端。`(public)`、`(account)`、`(dealer)`、`(admin)` 路由组使用独立布局和访问策略，但共享契约与设计系统。
- `api`：唯一业务写入口。产品价格解析、库存、状态机、企业隔离、审计均在这里完成。

## 后端模块化单体

首期不拆微服务。每个领域模块拥有 controller/application/domain/infrastructure 边界，跨领域通过公开应用服务或领域事件协作。异步工作交给队列，但业务真相仍保存在 PostgreSQL。

```text
HTTP -> Controller -> Application Service -> Domain Rule -> Repository/Adapter
                         |                     |
                         +-> Audit/Outbox      +-> PostgreSQL/Redis/S3/External API
```

## 安全与租户边界

- 用户、经销商、后台区域在同一前端应用内采用独立路由壳和访问策略，服务端会话仍区分受众。
- 经销商数据查询必须显式携带并校验 `company_id`，禁止依赖前端传入的企业 ID 直接授权。
- 管理权限使用 RBAC + 账号级增减权限；危险操作要求重新认证或 MFA。
- 所有重要写请求生成 `request_id`，关键实体修改同时写审计日志。

## 数据库无物理外键

跨表字段仍使用明确的整数逻辑 ID，例如 `order_items.order_id`、`dealer_members.company_id`，并建立查询索引。创建、更新和删除由应用事务检查关联存在性、状态与数据边界；清理使用归档、软删除和一致性巡检。详细规则见 `packages/database/AGENTS.md`。
