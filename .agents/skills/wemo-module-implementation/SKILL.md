---
name: wemo-module-implementation
description: 在 WEMOVE SPORTS 仓库中，根据指定工作流或代码模块的 README.md 与适用 AGENTS.md，把现有 TypeScript 基架补成可运行、可验证并有需求追踪证据的真实功能。用于实现模块，不用于只做方案评审或创建空脚手架。
---

# WEMO 模块真实实现

## 输入与范围

要求用户指定一个模块目录；四人并行开发默认从 `docs/workstreams/01-experience-content` 至 `04-platform-operations` 中选择一个。若给出具体代码模块，则以该目录的 `README.md` 为功能范围，并读取从仓库根到目标路径上全部适用的 `AGENTS.md`。

未指定目录时，先从请求中可明确对应的工作流推断；只有多个工作流同样合理且选择会显著改变修改范围时才询问。不要同时认领两条工作流，不要创建第二个前端应用或微服务。

## 建立真实基线

在写代码前完成以下检查：

1. 读取根 `AGENTS.md`、所选模块的 `README.md` 与 `AGENTS.md`，以及目标源码路径沿途的全部 `AGENTS.md`。项目约束优先于本 skill。
2. 从模块 README 列出的章节和需求 ID 回读 `网站重构需求.md`，再定位 `docs/requirements-traceability.md` 中对应条目。README 是范围摘要，需求文档才是业务基准。
3. 检查 `git status`、现有源码、测试、schema/migration、公开导出和真实应用装配。把已有能力、占位基架、缺口和其他工作流依赖分开；不得把目录、空模块或类型声明当成功能完成。
4. 沿生产入口追踪参数来源、actor/`company_id`、状态不变量、事务和 adapter 生命周期。只有真实入口可达的现象才可认定为缺陷或验收证据。

## 实现方式

把模块拆成可独立验收的端到端切片，并持续完成所选 README 的范围。每个切片按实际需要贯通：

`Zod 契约与枚举 -> 数据模型/迁移 -> repository/adapter -> domain/application service -> HTTP -> 前端真实路由 -> 自动化测试 -> 追踪证据`

- 优先完成模块 README 的“实施顺序”和协作 port，再实现依赖这些 port 的页面或流程。依赖尚未合并时使用遵守同一契约的确定性 fake，不深层导入其他模块 repository。
- 简单用例使用最短清晰结构；只有复杂规则确实需要时才拆 controllers/application/domain/infrastructure，不创建空层或占位类。
- 全部源代码、配置和脚本使用 TypeScript。前端只调用 `/api/v1` 契约，不依赖数据库，不复制价格、权限或状态机规则。
- 数据库使用自增整数主键和整数逻辑 ID，不声明 Prisma 关系字段或物理外键；application service 在事务中校验存在性、状态、删除限制和企业边界。
- 价格、订单、报价、付款、退款、审核和审计保留快照或只追加历史。经销商私有数据始终从服务端 actor 限定 `company_id`。
- 外部服务通过 adapter；密钥不入库。除非用户当前请求明确授权，不向互联网或外部服务写入、上传、发送、部署或发布。
- 遵守工作流文件所有权。共享热点默认交给 04；若当前请求包含最终集成，只做最小追加并保留其他人的改动。

不要停在 mock 页面、内存数组、恒定返回值、空 controller/service、未执行 migration 或只验证独立 helper 的“完成”状态。fake 只用于隔离尚未合并的协作端口和自动化测试，生产入口必须连接真实持久化或明确的 adapter。

## 验证与证据

验证强度随风险增加，但至少包含：

1. 模块契约的解析成功与拒绝测试。
2. HTTP、公开 application service 或实际 Next.js 路由的正常与拒绝路径；权限、`company_id`、状态机、金额、库存、文件或 Webhook 涉及时覆盖并发/幂等/越权。
3. 受影响工作区的 typecheck、test、build，以及数据库约束检查。最终集成运行根目录 `pnpm check`；若环境依赖阻止某项，记录准确命令、错误和未验证风险。
4. 对照 README 和需求 ID 复核加载、空、错误、权限、移动端、键盘、SEO、分析、日志或指标等适用状态。
5. 只有代码、必要迁移、真实入口测试、权限验证、可观测性和文档全部完成时，才在 `docs/requirements-traceability.md` 将条目标为 `done`，并登记代码入口、测试命令/用例、执行日期与人工验收状态。部分完成保持 `in-progress`，不得伪造截图、UAT、性能或安全结果。

## 交付

完成后报告实现的需求 ID、关键代码入口、迁移、自动化验证、仍需人工验收的事项和跨工作流接入点。除非用户明确要求，不提交、推送或创建外部 PR；用户要求提交时先检查 diff，只提交本任务文件并使用约定式提交消息。
