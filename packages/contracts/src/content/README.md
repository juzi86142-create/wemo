# Content 契约

- 内容条目（`ContentEntrySchema`）以 `type` 承载 Page、Article、FAQ、Banner、Navigation 等类型；发布状态与翻译状态分离，支持市场/语言与 `published_at`/`archived_at`（演示级别暂无独立版本/定时上下线契约）。
- 导航（`ContentNavigationSchema`）、SEO（`SeoMetadata*`/`SeoRedirect*`/`SeoSitemap*`）、搜索（`SearchQuery`/`SearchResponse`）、媒体（`MediaAsset*`/签名 URL）与表单提交（`FormSubmission*`）契约同属本域；本地化快照（`Localization*`）契约亦在此维护。
- 通知模板与投递（`NotificationTemplate*`/`NotificationDelivery*`）契约保留供既有 API 形状使用；演示模式服务端不落库（notifications 模块为 stub）。
