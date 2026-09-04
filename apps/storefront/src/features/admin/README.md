# Admin 管理后台模块

## 功能包

- Dashboard：待办、异常、业务指标、敏感金额权限和 CSV 导出。
- Products/Taxonomy/Media：产品变体、分类属性标签、资源、下载、关联、批量操作和历史。
- Pricing/Inventory：零售/B2B/专属/阶梯/促销价格、多仓库存、预占和展示规则。
- Orders/Quotes：B2C/B2B 订单、人工订单、付款、发货、取消、退款、报价版本和转单。
- Dealers/Users：申请审核、企业/成员/门店/授权/条款、用户/订阅/隐私请求。
- Content/Forms/SEO：页面、首页模块、文章、FAQ、导航、线索、重定向、Sitemap 和质量检查。
- Reports/Settings/Roles/Audit：运营报表、七类设置、RBAC、危险操作重认证和审计检索。

## 实现边界

菜单和按钮按权限显示，但 API 仍是最终授权方。关键业务数据以归档/软删除为主；价格、退款、权限、导出和密钥修改需明确确认、重新认证和审计。

## 验收范围

覆盖 `A-001` 至 `A-016` 及所有 `ADM-P-*`、`ADM-PR-*`、`ADM-O-*`、`ADM-D-*`、`ADM-C-*` 要求。
