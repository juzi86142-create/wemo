# Catalog 数据

- Product 与 Variant/SKU 分离；无显式变体产品也由服务层创建默认 SKU。
- 分类父子、产品主分类、翻译和变体都使用逻辑 ID 加索引，不建外键。
- 演示模式无独立媒体/关联/标签/属性模板表——媒体、推荐等关联由逻辑 ID 数组或留待前端/后续版本承担；翻译以 `product_translations` 保存多语言内容与翻译状态。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| Category | `categories` | 分类树（parent_id 逻辑父子）；slug 唯一、localized_content Json |
| Product | `products` | 产品主体；状态/年龄范围/attributes/market_visibility Json、发布时间 |
| ProductTranslation | `product_translations` | 产品翻译（market+locale+slug 唯一）；名称/简介/正文 Json/翻译状态 |
| Variant | `variants` | SKU 实体；sku/barcode 唯一、options/specifications Json |
