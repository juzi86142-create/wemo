# Identity 数据

- 用户、会话、角色与用户角色（权限覆盖 `user_roles.overrides`）为核心身份表。
- 邮箱唯一性、活跃会话检索和软归档（`users.archived_at`）由索引与服务层共同保证。
- 地址本、订阅、通知投递与数据请求持久化在 Redis（`wemo:user:{id}:addresses`、`wemo:user:{id}:subscriptions`、`wemo:user:{id}:data-requests`、`wemo:notifications:deliveries`），不落 PostgreSQL；收藏与通知偏好暂无落库（待定）。订单收货地址以订单快照承担，经销商地址见 dealers 域。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| User | `users` | 邮箱唯一；audience/status/验证与归档时间 |
| Role | `roles` | 角色定义（code 唯一） |
| UserRole | `user_roles` | 用户-角色关联；`overrides` Json 存权限覆盖 |
| Session | `sessions` | 会话令牌，按 user 与过期时间索引 |
