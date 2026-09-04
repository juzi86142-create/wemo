# 前端业务功能总览

`apps/storefront/src/features` 是唯一 React 前端中的业务功能目录，统一承载公开官网、用户中心、经销商中心、管理后台和平台能力。

- 不新增第二个前端应用；不同受众通过路由分组和访问策略区分。
- 页面与组件通过 `@wemo/contracts` 访问 API 契约，通过 `@wemo/ui` 复用设计令牌和共享组件。
- 前端不直接依赖 `@wemo/database`，权限和企业边界必须由 API 服务端再次校验。
