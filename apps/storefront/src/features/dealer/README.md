# Dealer 经销商中心模块

## 页面任务

- Dealer Dashboard、Catalog、Quick Order、Quotes、Orders、Invoices、Downloads。
- Company、Team、Addresses、Support、Security 与经销商公告。
- SKU+数量粘贴/CSV、逐行校验、批量加购、MOQ/倍数/箱规、库存档位与交期。
- 报价请求/版本/接受/拒绝/过期/转订单，B2B PO/账期/确认/分批发货/复购。

## 数据边界

前端不接受可切换的任意 `company_id` 作为授权依据。目录、价格、订单、报价、成员、地址和文件都以后端当前会话企业范围为准；Suspended/Closed 状态需立即反映受限能力。

## 验收范围

覆盖 `D-001` 至 `D-009`、`B2B-001` 至 `B2B-007`、`QTE-001` 至 `QTE-006`、`ORD-B2B-001` 至 `ORD-B2B-007`。
