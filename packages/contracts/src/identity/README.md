# Identity 契约

- 区分普通用户、经销商和后台员工三种会话受众（`AccountAudienceSchema`）。
- 定义账号状态、服务端解析后的 actor（`SessionActorSchema`）和模块+动作权限字符串（`PermissionCodeSchema`）。
- `company_id` 只用于表达服务端认证结果（`DealerContextSchema`），不能作为客户端自行选择企业的授权凭据。
- 演示模式：地址本、订阅、通知偏好与数据导出工单（`IdentityAddress*`/`IdentitySubscription*`/`IdentityNotification*`/`IdentityDataRequest*`）契约保留为既有 API 形状，服务端不落库（列表空、写抛「Demo模式：暂不支持…」或空实现）。
