# API 包说明

## 入口与发布契约

- `src/main.ts` 是 Node.js API 入口，使用 NestJS + Fastify，统一前缀为 `/api/v1`。
- `src/app.module.ts` 只负责装配模块；业务规则不得堆放在根模块或 controller。
- 公共接口必须使用 `@wemo/contracts` 的输入输出模型，并返回 `code/message/field_errors/request_id` 一致错误结构。

## 领域边界

- 身份与权限：`auth`、`identity`。
- 商品交易：`catalog`、`pricing`、`inventory`、`cart`、`orders`、`payments`、`returns`、`quotes`。
- 经销商：`dealers`，所有读写必须从服务端身份解析 `company_id`。
- 运营内容：`cms`、`media`、`forms`、`search`、`seo`、`localization`、`notifications`、`analytics`、`reports`。
- 平台能力：`settings`、`integrations`、`jobs`、`audit`。

共 24 个模块。演示模式 stub 模块（对应表已从 `schema.prisma` 移除，读返回空、写抛「Demo模式：暂不支持…」）：`analytics`、`cart`（`previewPricing` 例外，按 `prices` 真实计价）、`notifications`、`integrations`、`jobs`、`reports`。`identity`/`dealers`/`inventory`/`orders` 的地址本、订阅、库存预占等接口亦为 stub（见各模块 README）。

## 实现约束

- 采用 controller -> application service -> domain -> repository/adapter 的最短清晰调用链。
- 跨模块只调用对方公开 service/port，不直接读取对方 repository。
- 所有价格、库存、授权、状态转换在服务端执行；重要写操作与审计记录处于同一业务事务（演示模式已移除 outbox 队列，异步通知/Webhook/批处理由对应 stub 模块按 demo 语义承担）。
- Webhook/异步批处理要求仅在非 stub 实现生效：Webhook 必须验签、防重放、幂等；异步批处理必须记录任务状态和逐项失败原因（演示模式 integrations/jobs 为 stub，不落库）。
- 数据库无物理外键；删除/归档前的逻辑关联检查由 application service 完成。

## 测试要求

优先从 HTTP 或公开 application service 覆盖真实调用链。状态机、企业隔离、价格优先级、支付回调和文件授权必须包含拒绝路径与并发/幂等场景；库存预占在演示模式下为软校验/合成结果，测试按 stub 语义调整。
