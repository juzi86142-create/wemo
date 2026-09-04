# Account 用户与 B2C 模块

## 页面任务

- 登录/注册、邮箱验证、找回密码和账户安全反馈。
- `/account` Dashboard、Profile、Addresses、Favorites、Orders、Returns、Subscriptions、Security。
- 游客购物车、登录合并、结算、支付结果和订单成功页。
- B2C 市场开关关闭时隐藏零售价格与结算入口，切换为 Where to Buy 或 Contact。

## 关键规则

注册、条款同意、营销订阅分别表达；不采集儿童档案。库存和金额在提交前以后端重算为准。账户删除是受追踪请求，订单财务记录按法规去标识或受限保留。

## 验收范围

覆盖 `U-001` 至 `U-007`、`USR-001` 至 `USR-010`，以及 B2C 购物车、结算、支付、订单和售后要求。
