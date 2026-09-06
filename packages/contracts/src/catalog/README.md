# Catalog 契约

- 定义商品公开与后台视图（`CatalogProductSchema`/`CatalogVariantSchema`），避免敏感字段混入公开 DTO。
- 发布状态、市场可见性、分类（`CatalogCategorySchema`）、变体选项/规格、标签、`media_asset_ids` 与 `related_product_ids` 等引用字段。
- 价格和库存不嵌入基础商品真相，按当前市场与身份从 `@wemo/contracts` 的 commerce 契约（PricingPreview/InventoryBalance）组合。
