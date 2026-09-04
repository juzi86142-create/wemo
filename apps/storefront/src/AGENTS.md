# 前端源码说明

## 目录职责

- `app/`：路由、布局、metadata、服务端数据装配和错误边界。
- `features/`：按 `public-site/account/dealer/admin/platform` 划分的页面业务。
- 通用视觉组件进入 `@wemo/ui`；仅在单个领域复用的组件留在对应 feature。

## 路由区域

- `(public)`：公开官网，SSR/预渲染并支持 SEO。
- `(account)`：`/account` 用户中心与 B2C 登录态页面。
- `(dealer)`：`/dealer` 经销商中心，必须校验经销商身份与企业状态。
- `(admin)`：`/admin` 管理后台，按模块+动作权限装配页面。

路由组只隔离布局，不是安全边界。所有数据权限由单体 API 再次判断。

## 数据与状态

- 服务端读取优先用于首屏、SEO 和权限前置判断；交互更新通过契约化 API 客户端。
- 不在 feature 中手写后端 DTO；请求/响应和枚举来自 `@wemo/contracts`。
- 筛选、排序和分页状态写入 URL；短暂 UI 状态留在组件内。
- 错误展示 request_id；不得吞掉支付、订单、报价、上传和发布失败。

## 质量要求

组件和页面同时覆盖加载、空、失败、无权限和完成状态。新增交互必须可键盘操作、具备焦点样式和可读标签，并尊重 `prefers-reduced-motion`。
