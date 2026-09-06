# Platform 契约

- 定义市场、语言、币种、时区、功能开关和客户端安全配置（公开快照 `PublicPlatformConfigSchema`）；市场配置使用独立语言实体和 locale 关联，明确默认语言、URL 前缀与缺失翻译回退策略。
- 定义第 18 章核心分析事件（`AnalyticsEventNameSchema` + 各事件可辨识联合 schema），金额参数使用最小货币单位；审计（`AuditLog*`）、集成适配器（`Integration*`）、作业（`Job*`/`JobRun*`）、报表（`Report*`）、outbox 事件（`OutboxEvent*`）契约按需求章节保留。
- 外部集成密钥、内部配置和审计详情不得通过本包的公开前端契约泄漏。
- 演示模式：分析事件、集成、作业、报表与 outbox 契约仅供 API 形状使用——对应表已从 schema.prisma 移除，服务端 analytics/integrations/jobs/reports 模块为 stub（读空/写抛 demo 错误）；审计、平台设置与市场/语言真实落库。
