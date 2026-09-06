# Dealers 数据

- 经销商申请、企业与成员为当前实体表；申请 `payload` Json 保存表单/资质字段，企业 `terms` Json 保存付款条款、授权分类/区域等结构化配置。
- 演示模式已移除独立表：企业地址与门店明细不落库（API 地址接口为 stub，抛「Demo模式：暂不支持经销商地址管理」）；企业公开状态以 `dealer_companies.public_listing` 布尔表达。
- 企业等级（`tier_id`）、价格表（`price_list_id`）等只保存逻辑 ID；所有查询以 `company_id` 建索引，申请资质附件只保存 Media 逻辑 ID，不落公开 URL。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| DealerCompany | `dealer_companies` | 企业主体；country/tier/price_list/currency/terms/public_listing/status |
| DealerMember | `dealer_members` | 企业成员（company_id + user_id 唯一）；role/permissions Json |
| DealerApplication | `dealer_applications` | 入网申请；application_no 唯一、payload Json、审核时间与意见 |
