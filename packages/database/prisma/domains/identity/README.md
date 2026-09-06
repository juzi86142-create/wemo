# Identity 数据

- 用户、会话、角色与用户角色（权限覆盖 `user_roles.overrides`）为核心身份表。
- 邮箱唯一性、活跃会话检索和软归档（`users.archived_at`）由索引与服务层共同保证。
- 演示模式已移除独立表：地址本、订阅、通知偏好、数据导出工单（收藏亦不落库）——API 相应接口为 stub（列表空、写抛「Demo模式：暂不支持…」或空实现），订单/经销商地址改由快照或配置 Json 承担。

## 现有表

| 模型 | 表名（@@map） | 说明 |
| --- | --- | --- |
| User | `users` | 邮箱唯一；audience/status/验证与归档时间 |
| Role | `roles` | 角色定义（code 唯一） |
| UserRole | `user_roles` | 用户-角色关联；`overrides` Json 存权限覆盖 |
| Session | `sessions` | 会话令牌，按 user 与过期时间索引 |
