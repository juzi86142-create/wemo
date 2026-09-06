# Content 数据

- 统一内容条目骨架承载 Page、Article、FAQ、Banner、Navigation 等类型（`content_entries.type`），后续按内容类型拆结构化版本表。
- 媒体保存对象 key、MIME、大小、校验值、alt、可见级别与版本（`media_assets`），不在私有记录保存永久公开 URL。
- 表单/线索保存编号、类型、来源、负载、分配与状态（`form_submissions`）；附件和负责人使用逻辑 ID。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| ContentEntry | `content_entries` | 内容条目；market+locale+slug 唯一、body/seo Json、发布与归档时间 |
| MediaAsset | `media_assets` | 媒体资产；file_key 唯一、mime/size/checksum/visibility/version/metadata |
| FormSubmission | `form_submissions` | 表单提交；submission_no 唯一、payload Json、assignee_id 逻辑负责人 |
