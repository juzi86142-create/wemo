# 文档一致性审计报告（2026-09-07）

权威基准：`packages/database/prisma/schema.prisma`（30 个 model / 30 张 @@map 表，审计时已重新 grep 复核）；契约代码与 apps/api 模块目录为辅证。本次只改文档 md，未动任何 .ts / .prisma / 需求文档。

## 数据库文档（packages/database/prisma）

- `prisma/README.md` -> 只有通用规则、无域清单、未说明演示模式精简 -> 补充 8 域/30 表映射表与演示 stub 说明（购物车等由客户端状态承担）。
- `prisma/domains/commerce/README.md` -> 描述"购物车/行、订单是首批骨架，支付/发货/退货后续补充"，与现状完全相反（支付/发货/退货表早已存在，购物车表已删）-> 重写为现状：购物车/行不落库（客户端状态承担、cart 模块 stub），补 orders/order_items/quotes/quote_versions/payments/shipments/return_requests 7 表清单。
- `prisma/domains/identity/README.md` -> 声称"普通用户地址"落库、订阅/收藏等仍在后续规划 -> 纠正：地址本/订阅/收藏在演示模式不落库（API stub），补 users/roles/user_roles/sessions 4 表清单。
- `prisma/domains/dealers/README.md` -> 声称企业地址与公开门店落库、资质附件存 Media -> 纠正：地址/门店明细无独立表（地址 API 为 stub、公开态走 public_listing），补 3 表清单。
- `prisma/domains/inventory/README.md` -> 声称预占记录以 owner_type/owner_id 落库 -> 纠正：inventory_reservations 表已移除（orders 软校验、API stub），补 inventory_balances 1 表清单。
- `prisma/domains/platform/README.md` -> 声称可靠 outbox 为平台首批表 -> 纠正：outbox 已移除，redirects 补入本域，补 6 表清单。
- `prisma/domains/catalog/README.md`、`domains/content/README.md`、`domains/pricing/README.md` -> 描述与表一致但无清单 -> 分别补 4/3/2 表清单（pricing 补 valid_from/valid_to 生效窗口表述，去掉"更新价格新增历史记录"含混说法）。

## 契约文档（packages/contracts）

- `contracts/README.md` -> 只有构建说明、未区分契约保留与落库现状 -> 补演示模式说明（Cart/Notification/Address 等契约保留、落库与否以 schema.prisma 与 API 为准）。
- `contracts/AGENTS.md` -> commerce/content/platform 域行描述与实际导出不符 -> 修正（commerce 注明购物车/预占契约保留暂不持久化；content 补搜索/表单/通知契约；platform 补审计/集成/作业/报表），新增"契约是否落库"提示段。
- `contracts/src/commerce/README.md` -> 未提 Cart/InventoryReservation（grep 确认契约代码仍含 CartSchema/CartMergeSchema/InventoryReservation* 等）-> 补描述并注明"演示模式服务端暂未持久化"（表已删、cart 为 stub、订单可带可选 cart_id）。
- `contracts/src/content/README.md` -> 声称"定时上下线、版本与预览"，schema 无对应字段 -> 修正为 type 字段区分内容类型、published_at/archived_at 语义；补导航/SEO/搜索/表单/本地化/通知模板契约归属说明与 notifications stub 注。
- `contracts/src/catalog/README.md` -> "媒体、下载与关联产品"与 CatalogProductSchema 键不完全一致 -> 改为 media_asset_ids/related_product_ids/tags 等实际引用字段表述。
- `contracts/src/common/README.md` -> 只提 createPaginatedResponseSchema -> 补 createListResponseSchema（响应 items/page/page_size/total）与 createItemResponseSchema（request_id+item）。
- `contracts/src/dealers/README.md` -> 地址/门店表述未区分契约保留与落库 -> 补演示注（公开门店列表由 public_listing 输出；DealerAddress 契约保留、服务端不落库）。
- `contracts/src/identity/README.md` -> 未说明被删表契约状态 -> 补演示注（地址/订阅/通知/数据工单契约保留、列表空/写抛错）。
- `contracts/src/platform/README.md` -> outbox/集成/作业/报表契约描述像真实服务 -> 补演示注（对应表移除、模块 stub；审计/设置/市场语言真实落库）。

## API 文档（apps/api）

- `apps/api/README.md` -> "各业务模块待实现任务见 modules README"过时 -> 改为 24 模块全部通过 typecheck、列出 6 个演示 stub 模块（analytics/cart/notifications/integrations/jobs/reports）及语义。
- `apps/api/AGENTS.md` -> 约束条款声称"可靠 outbox 流程"、Webhook/异步批处理必做项与 stub 现状冲突 -> 修正 outbox 已移除、Webhook/批处理要求限定非 stub 生效；域清单确认与目录一致（24 模块）并补 stub 列表；测试要求注明预占按 stub 语义调整。
- `apps/api/src/AGENTS.md` -> 结构说明未提演示 stub -> 新增"演示模式 stub 模块"段落（24 模块总数、6 stub + identity/dealers/inventory/orders 局部 stub）。
- `apps/api/src/modules/README.md` -> 无模块清单 -> 新增 24 模块现状表（真实落库 / 混合 / 演示 stub 三档 + 各模块对应 @@map 表，search/seo 经代码核实为组合查询与 redirects+content_entries）。

## 测试文档

- `apps/api/tests/README.md` -> 覆盖表除 localization 外全 ⏳、RUN_HTTP_INTEGRATION 门禁已不存在、分类位置过时 -> 更新为现状：localization ✅（单元+数据库+HTTP）、contracts ✅（6 文件 17 用例）、AppModule 装配 ✅、API Integration ✅（health/localization/catalog happy path，真实 DB）、Health ✅；其余模块 ⏳ 并注明 6 个 stub 模块按 stub 语义补测；修正运行说明（仅 RUN_DATABASE_INTEGRATION 门禁，HTTP 测试默认运行）。

## 需求追踪

- `docs/requirements-traceability.md` -> 第 14 章（数据模型）、第 15 章（接口集成）、第 19 章（通知）标 done，但对应实现为演示 stub -> 仅此三行改为 in-progress，并在"主要验收物"注明演示模式范围（30 张核心表/购物车等已移除；integrations/jobs stub；通知模板与投递不落库）；其余行状态未动。

## Worklog 清理

- `apps/api/src/modules/_worklog-auth-identity.md`、`_worklog-dealers.md`、`_worklog-inventory-orders.md`、`_worklog-stub-modules.md` -> 重构期临时记录 -> 合并为 `apps/api/src/modules/REFACTORING-NOTES.md`（通用约定 + 各模块修复要点 + 剩余风险 + 跨模块遗留），4 个原文件已删除。

## 备注

- 任务背景描述的"28 表"与实测不符：schema.prisma 现为 30 个 model/30 张表（且 schema 首行注释"25张"亦过时，属代码注释未改）。本报告所有数量与 @@map 表名以审计时 grep 结果为准，文档中表格与 schema 逐一对齐。
- `网站重构需求.md` 未改动。
- 校验结果：`git diff --name-only HEAD` 28 个路径全部为 *.md（24 修改 + 4 删除），新增 REFACTORING-NOTES.md 亦为 md，无 .ts/.prisma 变更。
