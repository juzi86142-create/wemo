# Settings 模块

- 作为管理后台设置页的聚合入口，不创建第二套业务配置或绕过领域服务写库。
- Market/语言归 Localization，Commerce 归交易模块，Dealer 归 Dealers，Email 归 Notifications，Brand 归 CMS，Security 归 Auth，Integration 归 Integrations。
- 仅持有跨领域平台功能开关；敏感值只保存密钥引用，变更需高权限、重新认证和审计。
- 通过各领域公开 service 组合带版本的只读配置快照，供前端一次读取。
