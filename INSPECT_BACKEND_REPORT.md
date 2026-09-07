# 后端与数据库对齐检查

## 结论

`apps/api` 除 localization 外几乎全部使用进程内 StateStore 数组，未通过 Prisma 访问 PostgreSQL。`app.module.ts` 显式装配 `ExperienceStateModule`、`CommerceStateModule`、`IdentityStateModule`，各 service 注入对应 StateStore。重启即丢数据，且 StateStore 的对象结构是 API contract DTO，不是 Prisma schema 实体。

## 真实数据库路径

- `apps/api/src/database/database.module.ts` 创建并导出 Prisma client。
- `apps/api/src/modules/localization/localization.prisma-repository.ts` 是唯一生产 repository；`LocalizationModule` 绑定 `LOCALIZATION_REPOSITORY -> LocalizationPrismaRepository`。
- `LocalizationService` 的语言/市场列表和写入走 Prisma，但 `snapshot()` 在 `ExperienceStateStore` 可注入时优先读内存，导致快照仍非数据库真实值。

## 主要 mock / StateStore

- `apps/api/src/modules/identity/identity.state.ts`：users/roles/addresses/subscriptions/dealerApplications/dealerCompanies/dealerMembers/sessions/notifications 全为数组和自增序列，含 user@wemove.local、dealer@wemove.local、staff@wemove.local 等种子。
- `apps/api/src/runtime/experience.state.ts`：markets/locales/routes/categories/products/mediaAssets/contentEntries/redirects/formSubmissions/notificationTemplates/notificationDeliveries/pricingRecords/inventoryBalances 等内存种子及 CRUD。
- `apps/api/src/runtime/commerce.state.ts`：pricing/inventory/reservation/cart/order/payment/return/quote/quoteVersion 全为内存数组，自增 id 和幂等 Map。
- `apps/api/src/runtime/platform-state.store.ts`：settings/auditLogs/outboxEvents/jobs/integrations/webhook deliveries/analytics 全为内存数组/Map。
- 各领域 service（auth、identity、dealers、catalog、pricing、inventory、cart、orders、payments、returns、quotes、cms、media、forms、search、seo、notifications、analytics、integrations、jobs、reports、settings、audit）均注入这些 StateStore；只有 localization service 注入 Prisma repository。

## Contract 与 Prisma schema 明显不一致

1. **User/Identity**：`IdentityUser` 需要 `audience`，DB `User` 没有该列；`IdentityDataRequest`、`IdentityNotification` 在 schema 没有对应表；`AuthSession` DTO 需要 token/company_id/permissions/last_seen_at，DB `Session` 只有 user_id/audience/expires/revoked/created；`IdentityRole.permissions` 在 DB `Role` 无权限字段（`UserRole.overrides` 只能部分承载）；`IdentityNotification` 与 DB `NotificationDelivery` 语义和字段不同。
2. **Dealer**：DTO `DealerApplication`/`DealerCompany`/`DealerMember` 含 display_name、website、business_type、tax_id、payment_terms、sales_territories、authorized_categories、sales_rep、public_listing、reviewed_at、company_id、invited_at/joined_at 等；DB 表仅保留 legal/display/country/contact/payload 或少量字段，需明确把扩展字段拆列或放 JSON，并补审查/成员时间字段。
3. **Catalog**：DTO `CatalogProduct` 把 slug/name/short_description/description/tags/localized_content/category_ids/media_asset_ids/related_product_ids/variants/primary_image_url 聚合在一个实体；DB `Product` 仅 primary_category_id/status/age/attributes/market_visibility/published/archived/created，文本在 `ProductTranslation`，且无产品分类关联表、媒体关联表、related 表。DTO `CatalogVariant` 有 `primary_image_url/created_at/updated_at`，DB `Variant` 没有后三者字段（仅 sku/barcode/options/specifications/status）。DTO category 的 name/created/updated 不在 DB Category（仅 localized_content/sort/status/sort_order）。
4. **Commerce**：DTO Cart/Order/Quote 聚合 items、totals、history、versions、snapshots；DB 分拆 CartItem/OrderItem/QuoteVersion，需 repository 查询并组装。DTO `CartItem` 有 unit_price、line_total、currency、snapshot、added_at/updated_at，DB `CartItem` 只有 cart_id/variant_id/quantity。DTO OrderItem 有 shipping_minor，DB OrderItem 无该列。DTO Payment 有 refunded_minor/payload，DB Payment 无；DTO ReturnRequest 有 history/refunded_at，DB ReturnRequest 无。DTO Quote 有 requested_by_user_id/pricing_snapshot/terms_snapshot/items/versions/updated_at，DB Quote 缺这些（仅 company/current_version/status/valid_until/converted_order/created）。
5. **Pricing/Inventory**：DTO PricingRecord 含 updated_at，DB Price 无 updated_at；DTO InventoryReservation 含 idempotency_key/updated_at，DB 表无这两列。DTO InventoryBalance `synced_at` 非 nullable，DB `syncedAt` 可空。
6. **Content/Platform**：DTO NotificationTemplate 无 DB 模型；LocalizationRoute 无 DB 模型（仅 MarketLocale 可近似 locale 路径）；Platform `JobRun`、`IntegrationAdapter`、WebhookDelivery、DataRequest 等均无对应 Prisma 模型；`SystemSetting`/`AuditLog`/`OutboxEvent`/`AnalyticsEvent` 有表但 service 仍使用 PlatformStateStore；`SeoRedirect` 与 DB Redirect 基本可映射。

## 建议实施顺序

先为每个领域建立 Prisma repository（按 schema 原子表读写，事务内处理逻辑关联），再将 service 的 StateStore 注入替换为 repository；DTO 聚合字段通过 mapper 从多表组装，写入时拆分到对应表。先补 schema 缺失实体/列和 migration（不使用物理外键），再迁移 identity/catalog/commerce，最后 platform/content。保留 StateStore 仅作测试 double，并在 Nest testing module 中显式替换 provider。Localization snapshot 应去掉对 ExperienceStateStore 的优先分支，统一由 repository 生成。
