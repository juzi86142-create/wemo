# Platform 前端平台模块

## 任务范围

- 应用壳：错误边界、加载骨架、Toast、request_id、登录态和按区域布局。
- 国际化与市场：locale 路径、切换、翻译缺失策略、货币显示和 `hreflang`。
- SEO：metadata、canonical、OG、Schema、robots、Sitemap 接入和品牌 404。
- 隐私与分析：必要/分析/营销 Cookie 同意，按同意状态加载脚本，采集第 18 章核心事件。
- 质量：响应式断点、WCAG 2.2 AA、减少动效、错误监控和 Core Web Vitals 上报。

## 边界

这里只提供跨页面能力，不承载商品、经销商、订单等领域规则。统一行为进入共享实现，页面特有逻辑保留在所属 feature。
