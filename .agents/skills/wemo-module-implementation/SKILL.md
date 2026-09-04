---
name: wemo-module-implementation
description: 在 WEMOVE SPORTS 仓库中接收用户指定的包或小模块，将现有 TypeScript 基架持续补齐为具备真实业务行为、生产装配、自动化测试和需求证据的完整实现。适用于完成 API 领域模块、前端 feature 子模块、共享契约域、数据库域或 UI 组件域。
---

# WEMO 指定包完整实现

## 调用结果

用户通过包路径或仓库内唯一名称指定交付目标，例如：

```text
$wemo-module-implementation 完成 apps/api/src/modules/catalog
$wemo-module-implementation 完成 pricing 包
```

解析调用语句中的目标包，并将该包 README 描述的全部能力及其关联需求作为本次完成范围。名称对应多个目录时，列出候选及其路径依据，请用户确认目标后继续。

把目标范围整理为可验证清单，持续实现清单中的下一项，直至代码、必要迁移、生产装配、自动化测试、权限与状态边界、可观测性和追踪证据全部完成。每个阶段完成后直接进入下一项，让一次调用产出完整的包实现。

## 资料读取顺序

按照由近到远的顺序读取与目标包相关的资料：

1. 读取仓库根 `AGENTS.md`，获取全项目技术边界和完成定义。
2. 读取目标目录的 `README.md`，并从仓库根到目标目录依次读取沿途全部 `AGENTS.md`。目标目录由上一级说明覆盖时，读取最近一级覆盖该目录的模块或包 README。
3. 检查目标包的现有源码、公开入口、测试、schema/migration 和应用装配，记录已有能力、待实现能力、调用方与依赖方。
4. 在 `docs/requirements-traceability.md` 中按包路径、领域名、实体名和 README 中的需求 ID 定位责任条目，再读取 `网站重构需求.md` 中对应 ID、章节、状态机、字段字典和 API 清单。
5. 根据目标包涉及的层读取配套资料：
   - API 输入输出：`packages/contracts/AGENTS.md`、对应领域 README 和公开 schema。
   - 数据持久化：`packages/database/AGENTS.md`、对应 `prisma/domains` README 与 `schema.prisma`。
   - 后端实现：`apps/api/AGENTS.md`、`apps/api/src/AGENTS.md` 和对应 API 模块 README。
   - 前端实现：`apps/storefront/AGENTS.md`、`apps/storefront/src/AGENTS.md` 和对应 feature README。
   - 共享 UI：`packages/ui/AGENTS.md` 和对应组件域 README。
6. 依赖方向、运行形态或实施阶段需要补充时，读取 `docs/architecture.md` 和 `docs/task-breakdown.md`。

当前用户请求确定交付范围，`网站重构需求.md` 提供业务基准，`AGENTS.md` 提供工程约束，模块 README 提供就近任务清单，现有代码与测试提供当前实现基线。

## 信息补全

模块资料需要扩展或统一时，依次执行以下动作：

1. 沿真实生产入口追踪 route/controller、application service、domain rule、公开 port、repository/adapter、schema、调用方和测试，明确参数来源、身份上下文、事务边界与生命周期。
2. 使用领域名、实体名、路由、API 路径和需求 ID 搜索追踪矩阵与需求原文，补齐输入输出、角色、状态、数据边界和验收条件。
3. 阅读相关 contracts、database、API、storefront 和 UI 领域说明，统一跨层契约；参考同层成熟模块的目录结构、错误处理、日志和测试模式。
4. 对影响公开 API、数据模型、状态机、金额、权限、安全或合规结果的业务选择，汇总已有证据并向用户提出一个聚焦问题。获得答案后将决策写入实现和测试，然后继续完成清单。
5. 对局部实现细节采用满足当前需求的最小方案，在代码或交付说明中记录依据，并用测试固化行为。

## 实现循环

先建立包级完成清单，再按依赖顺序实现端到端切片：

`Zod 契约与枚举 -> 数据模型/迁移 -> repository/adapter -> domain/application service -> HTTP 或前端路由 -> 自动化测试 -> 追踪证据`

每完成一个切片，执行相关测试并更新清单，然后继续下一个切片。实现过程中保持以下项目属性：

- TypeScript 覆盖前后端源码、配置与脚本，单一 React 应用和单体 Node.js API 形态保持稳定。
- 运行时输入通过共享 Zod schema 解析，前端经 `/api/v1` 获取业务数据，价格、权限和状态转换由服务端计算。
- 数据库以自增整数主键和整数逻辑 ID 表达实体关联，application service 在事务内维护关联存在性、状态、删除限制和企业边界。
- `company_id` 来自服务端认证上下文，订单、报价、价格、付款、审核和审计保存快照或只追加历史。
- 外部能力通过 adapter 接入，生产入口连接真实持久化或明确配置的 adapter；测试 fake 复现相同的失败、幂等和授权语义。
- controller、service、页面和任务消费者承载真实业务行为，应用根入口完成模块注册，日志、request_id、审计或业务指标覆盖关键流程。
- 外部写入、上传、发送、部署和发布在用户当前请求明确授权后执行。

## 完成验证

通过真实 HTTP、公开 application service 或 Next.js 路由验证正常、加载、空数据、错误、权限拒绝和完成状态。状态机、金额、库存、企业隔离、文件权限或 Webhook 场景同时覆盖并发、幂等和边界路径。

运行目标工作区的 typecheck、test 和 build，以及适用的架构、数据库与需求检查。共享契约、应用装配、schema 或整包完成发生变化时运行根目录 `pnpm check`。

逐项复核包级清单，为完成项登记代码入口、迁移、测试命令、执行结果、日志或指标和人工验收状态。具备完整证据的需求在 `docs/requirements-traceability.md` 标记为 `done`，正在形成证据的需求保持 `in-progress` 并继续推进。

最终交付包含完整实现范围、关键入口、迁移、验证结果、业务决策和人工验收记录。用户请求提交时，复核差异并创建约定式提交；用户授权外部动作时，按授权范围完成对应动作。
