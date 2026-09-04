# 四人并行工作流

## 目的

当前仓库已经按技术目录建立基架，但真实功能会同时穿过契约、数据库、API、前端与测试。这里把全部领域归并为四条端到端工作流，每条默认由一人或一个独立工作树负责，避免按“前端一人、后端一人”造成持续串行等待。

| 工作流                | 主要业务结果                                 | API 模块                                                    | 工作流说明                          |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| 01 体验、商品与内容   | 可发现、可索引、可运营的公开站               | catalog、cms、media、search、seo、localization              | `01-experience-content/README.md`   |
| 02 身份、用户与经销商 | 三类身份、账户、经销商申请和企业隔离         | auth、identity、dealers、forms、notifications               | `02-identity-dealers/README.md`     |
| 03 交易与履约         | B2C/B2B 从报价或购物车到付款、履约、售后     | pricing、inventory、cart、orders、payments、returns、quotes | `03-commerce-fulfillment/README.md` |
| 04 平台与运营         | 公共运行时、后台运营、任务、审计、分析与报表 | analytics、audit、integrations、jobs、reports、settings     | `04-platform-operations/README.md`  |

每个工作流目录中的 `README.md` 定义交付范围、需求入口和协作端口，`AGENTS.md` 定义 AI 或开发者可修改的路径、禁止跨越的边界与验证要求。开始工作前两份文件必须一起读取。

## 并行规则

1. 一条分支或工作树只认领一条工作流。领域代码放入该工作流拥有的目录；跨域只消费公开契约、application service 或 port。
2. 各工作流先交付“协作面”：01 提供商品/内容只读查询，02 提供 actor 与 `company_id` 范围，03 提供交易状态和事件，04 提供统一错误、审计、任务与 adapter 基础能力。协作面使用内存 fake 做契约测试，不能等待供应商或完整 UI 才验证。
3. 前端在现有 feature 下继续按下表所列子目录拆分，禁止把新页面逻辑继续堆进 feature 根 `index.ts`。后台同样按领域子目录拆分。
4. 不跨工作流深层导入 repository，不共享可变数据库事务对象，不用前端传入的角色或 `company_id` 代替服务端授权。
5. 共享文件由 04 统一集成。其他工作流保持领域入口可独立导出，并在交付说明中列出需要接入的模块、路由或根导出，不抢改共享装配文件。

## 文件所有权

| 工作流 | 前端 feature 子目录                                                                                                                                            | 共享包领域                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 01     | `public-site/{home,catalog,content,support,search}`、`admin/{catalog,content,seo}`、`platform/{localization,seo}`                                              | contracts/catalog、contracts/content；database/catalog、database/content；ui/tokens、ui/navigation、ui/content |
| 02     | `public-site/{dealers,dealer-application,forms}`、`account/{identity,profile,security}`、`dealer/{company,team,security}`、`admin/{dealers,users,forms,roles}` | contracts/identity、contracts/dealers；database/identity、database/dealers                                     |
| 03     | `account/{cart,checkout,orders,returns}`、`dealer/{catalog,quick-order,quotes,orders,invoices,downloads}`、`admin/{pricing,inventory,orders,quotes}`           | contracts/commerce；database/pricing、database/inventory、database/commerce；ui/commerce、ui/b2b               |
| 04     | `platform/{shell,consent,analytics,errors}`、`admin/{dashboard,reports,settings,audit,integrations,jobs}`                                                      | contracts/common、contracts/platform；database/platform；ui/primitives、ui/feedback                            |

表中的路径是新代码的目标位置；目录不存在时由认领者按需创建。每条工作流同时拥有与这些 feature 一一对应的 `apps/storefront/src/app` 路由叶子目录；04 只拥有共享 layout、error/loading、路由 guard 和根页面。现有 feature 根 `index.ts`、包根 `index.ts`、`apps/api/src/app.module.ts`、`apps/api/src/main.ts`、`packages/database/prisma/schema.prisma` 和根级工具配置属于共享热点，默认由 04 负责最终集成和冲突处理。数据库其他工作流只修改 schema 中自己领域的连续模型块，并在提交前与 04 协调，避免无关格式化造成整文件冲突。

## 合并顺序与完成标准

- 最先合并各工作流的契约和 port；04 随后接入根导出、模块装配和横向能力。业务实现仍可在各自工作树使用 fake 并行推进。
- 合并以端到端能力为单位，不合并只有空 controller、空 service、占位页面或未执行的 migration。
- 每条需求只有在真实入口测试、拒绝路径、权限/企业边界、日志或指标及 `docs/requirements-traceability.md` 证据齐全后才能改为 `done`。
- 四条工作流全部完成后，再统一执行迁移、全角色 UAT、性能、安全、无障碍和上线验收；工作流完成不等于项目最终交付。
