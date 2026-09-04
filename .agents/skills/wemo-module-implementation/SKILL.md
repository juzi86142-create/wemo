---
name: wemo-module-implementation
description: 在 WEMOVE SPORTS 仓库中，把已有小模块或包的 TypeScript 基架补成可运行、可验证的真实代码。用于模块已有 README 或 AGENTS 指引，需要继续定位需求、契约、数据、调用链和验收证据的实现任务；不用于纯架构规划或创建空脚手架。
---

# WEMO 小模块落地

## 确定目标

从用户指定的模块名、文件路径、当前工作目录或任务涉及的现有代码识别目标模块。目标明确时直接开始，不要求用户重复提供目录。目标通常是 API 领域模块、前端 feature 子模块、contracts/database 的领域目录或 UI 组件域。

以用户要求和目标模块职责为修改范围。为贯通真实调用链，可以修改该功能必需的契约、数据、API、前端、测试与追踪文档；不要顺手补齐相邻模块或扩大成整条业务线重构。

## 资料读取顺序

按以下顺序渐进读取，前一层足以确定实现时不加载无关资料：

1. 始终读取仓库根 `AGENTS.md`。
2. 读取目标目录的 `README.md`，并从仓库根到目标目录依次读取沿途所有 `AGENTS.md`。若目标目录没有 README，读取最近一级能够覆盖它的模块或包 README。
3. 检查目标模块现有源码、公开入口、测试和应用装配，确认它目前是空基架、部分实现还是已有真实调用方。读取一至两个同层已实现模块只用于复用工程惯例，不能从中臆造业务规则。
4. 在 `docs/requirements-traceability.md` 中按模块路径、领域名和 README 中出现的需求 ID 定位责任条目，再只读取 `网站重构需求.md` 中对应 ID、章节、状态机、字段字典或 API 清单。
5. 仅在实现跨层边界时读取相关资料：
   - API 输入输出：`packages/contracts/AGENTS.md`、对应领域 README 和公开 schema。
   - 持久化：`packages/database/AGENTS.md`、对应 `prisma/domains` README 与 `schema.prisma`。
   - 后端：`apps/api/AGENTS.md`、`apps/api/src/AGENTS.md` 和目标 API 模块 README。
   - 前端：`apps/storefront/AGENTS.md`、`apps/storefront/src/AGENTS.md`、目标 feature README；需要跨区域复用组件时再读 `packages/ui/AGENTS.md` 和对应组件域 README。
6. 只有依赖方向、部署形态或实施阶段仍不清楚时，才读取 `docs/architecture.md` 或 `docs/task-breakdown.md`；这些文档用于解释工程边界，不替代模块业务需求。

业务含义以 `网站重构需求.md` 为准，模块 README 是该需求的就近摘要；`AGENTS.md` 约束实现方式和目录边界；现有代码、schema 与测试只代表当前事实，不能把尚未实现的行为解释成需求取消。

## 信息缺失时

README 缺项、过时或只有目标描述时，按以下次序补足信息：

1. 沿真实入口检查 controller/route、application service、公开 port、repository/adapter、schema、调用方和测试，明确数据从哪里来、由谁授权、何时持久化。
2. 用领域名、实体名、路由、API 路径和需求 ID 搜索追踪矩阵与需求原文，确认输入输出、角色、状态、边界和验收条件。
3. 查看相关 contracts、database 和 UI 领域 README，确认跨层已有约定；查看相邻模块只提取结构、错误处理和测试模式。
4. 若业务选择会改变公开 API、数据模型、状态机、金额、权限、安全或合规结果，且上述资料仍无法确定，停止该选择并向用户询问。其他局部细节采用满足当前需求的最小假设，在代码或交付说明中明确记录并用测试固定。

不得用常量返回、随手编造的种子数据、前端硬编码、未声明的供应商行为或破坏现有状态不变量来填补信息空白。

## 补齐真实代码

先追踪目标模块的生产调用链和依赖，再拆成最小可验收的端到端切片。按适用范围贯通：

`Zod 契约与枚举 -> 数据模型/迁移 -> repository/adapter -> domain/application service -> HTTP 或前端路由 -> 自动化测试 -> 追踪证据`

- 简单模块使用最短清晰结构；只有复杂规则需要时才增加 controller/application/domain/infrastructure 分层，不创建空层。
- 运行时输入通过共享 Zod schema 解析，前端只经 `/api/v1` 访问业务数据，不复制服务端价格、权限或状态机规则。
- 数据库使用自增整数主键和整数逻辑 ID，不声明物理外键；application service 在事务内检查关联存在性、状态、删除限制和企业边界。
- `company_id` 从服务端认证上下文解析。订单、报价、价格、付款、审核和审计使用快照或只追加历史。
- 外部能力通过 adapter；测试可使用遵守相同失败、幂等和授权语义的 fake，生产入口必须连接真实持久化或明确配置的 adapter。

不要停在空 controller/service、mock 页面、内存数组、恒定返回值、未执行 migration 或只覆盖独立 helper。实现必须接入现有应用入口，并证明 README 描述的正常流程和拒绝流程真实可达。

## 验证与完成

优先运行目标工作区的 typecheck、test 和 build，并执行适用的架构、数据库与需求检查。修改共享契约、装配、schema 或完成整个模块时运行根目录 `pnpm check`。权限、`company_id`、状态机、金额、库存、文件或 Webhook 涉及时，测试真实 HTTP、公开 application service 或 Next.js 路由，并覆盖越权、并发或幂等路径。

只有代码、必要迁移、真实入口测试、权限验证、可观测性和文档证据齐全时，才把 `docs/requirements-traceability.md` 的对应条目标为 `done`；部分完成保持 `in-progress`。完成后报告实现范围、关键入口、验证命令、未完成的人工验收与仍存在的最小假设。除非用户明确要求，不提交、推送或执行外部写入。
