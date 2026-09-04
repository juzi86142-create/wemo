# Localization 模块

- 管理市场、语言、币种、时区和内容回退策略；跨领域平台功能开关由 Settings 管理。
- 语言与市场分别建模，共享 SKU/库存主数据，翻译内容维护独立状态。
- 为前端提供可用 locale、语言市场路径和区域业务规则。

## 公开入口

- `GET /api/v1/localization/languages`：分页读取启用语言。
- `GET /api/v1/localization/markets`：分页读取市场、locale、路径和回退策略。
- `GET /api/v1/localization/market-context?market=US&locale=en-US`：解析请求 locale；只有 `default_locale` 策略允许完整回退。
- `LocalizationService`：向其他后端模块公开读取与管理用例；管理操作仅接受 staff 且具有 `localization:manage` 权限的服务端身份上下文。

生产 repository 使用 Prisma；语言逻辑 ID、市场逻辑 ID 与 locale 关联在同一事务内校验和保存。
