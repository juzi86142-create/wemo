# Dealers 契约

- 定义申请、企业、成员、地址（`DealerAddress*`）、公开门店（`DealerPublicListing*`）、企业上下文与审核命令/响应。
- 申请与企业生命周期使用不同枚举（`DealerApplicationStatus`/`DealerCompanyStatus`），避免把 Approved 与 Active 混成同一状态。
- 公开门店 DTO、经销商门户 DTO 和后台审核 DTO 分离，资质文件绝不进入公开契约。
- 演示模式：企业/申请/成员表仍在 schema.prisma，服务端真实持久化；公开门店列表由 `dealer_companies.public_listing` 筛选输出。地址明细表已移除、服务端不落库（`DealerAddress*` 契约保留为 API 形状，列表空、写抛「Demo模式：暂不支持经销商地址管理」）。
