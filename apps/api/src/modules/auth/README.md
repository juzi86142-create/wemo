# Auth 模块

- 实现用户、经销商、后台员工三类登录受众的注册、登录、退出、邮箱验证、密码找回、修改密码与退出其他设备。
- 密码使用 Node 原生 scrypt 自适应哈希；会话为随机 32 字节令牌存 `sessions` 表，默认 7 天有效。
- 身份一律由服务端会话解析（`SessionActorResolver`）：`Authorization: Bearer <token>` → sessions → users → dealer_members/user_roles+roles，客户端身份头一律不信任。
- 邮箱验证与密码重置令牌存 Redis（`wemo:verifications`），验证成功才将用户置为 active。
- 登录/注册/找回/验证接口经 @nestjs/throttler 每 IP 每分钟限流 10 次。
- Demo 简化：MFA、敏感操作重新认证、异常登录提示未实现；邮件经 notifications 投递记录承载不真实发送。
