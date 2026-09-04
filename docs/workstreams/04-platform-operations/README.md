# 04 平台与运营

## 目标

交付其余工作流可依赖的公共运行时和运营闭环：统一错误与 request_id、应用壳、基础 UI、设置、adapter、任务、审计、分析、报表、可观测性及共享装配。

## 所有权

- API：`analytics`、`audit`、`integrations`、`jobs`、`reports`、`settings`，以及根启动、全局 guard/interceptor/filter 和模块装配。
- 前端：`src/app` 的共享 layout、error/loading、路由 guard 与根页面，`platform/{shell,consent,analytics,errors}`、`admin/{dashboard,reports,settings,audit,integrations,jobs}`，以及 feature 根入口的最终装配。01/02/03 各自拥有对应业务路由的叶子目录。
- 共享包：`contracts/{common,platform}`、数据库 `platform` 领域、UI `primitives/feedback`，以及各包根导出集成。
- 需求入口：第 1、7.1、7.2、7.14、13、15、17、18、20、21、22 章，`PERF-*`、`ACC-*` 和后台 Dashboard/Reports/Settings/Audit/Jobs 要求。

## 实施顺序

1. 先发布统一 ID/分页/错误、request_id、actor 传递接口、基础表单/反馈组件、adapter 与 audit/outbox/jobs port，让其他工作流可用 fake 并行实现。
2. 贯通“请求 -> 结构化日志/request_id -> 授权上下文 -> 业务调用 -> 审计/outbox -> 任务执行/失败重试 -> 指标”的运行时链路。
3. 实现同意管理、核心事件、六类报表、设置聚合、集成健康、任务追踪和后台页面；Settings 只能调用领域公开 service，不能建立第二份业务配置。
4. 在明确的集成窗口接入其他工作流的根导出、Nest 模块和 Next.js 路由，并运行全仓门禁。

## 协作面

- 向其他工作流提供稳定的错误、日志、审计、outbox、任务和供应商 adapter 接口；开发测试提供确定性内存实现。
- 只聚合领域设置和报表，不绕过 01/02/03 的 service 直接改其 repository。
- 负责共享热点：`apps/api/src/{main.ts,app.module.ts}`、`apps/storefront/src/app`、feature/package 根 `index.ts`、根工具配置和最终 schema 集成。

## 完成标准

必须覆盖 request_id 贯穿、错误脱敏、审计只追加、任务可重入/可重试、Webhook 验签与防重放、同意状态过滤、事件去重、报表权限、敏感设置重新认证、健康检查和依赖降级。最后运行全仓检查，并登记迁移、性能、安全、无障碍和 UAT 的实际证据；不能用“已装配”代替功能完成。
