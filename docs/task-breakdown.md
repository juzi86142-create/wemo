# 需求任务拆解

## 使用方式

本拆解覆盖 `网站重构需求.md` 的全部正式要求。优先级用于安排先后，不改变最终范围：所有阶段完成并在 `requirements-traceability.md` 留下验收证据后，项目才算完整交付。

## 交付阶段

| 阶段 | 主要结果 | 负责工作区 | 退出条件 |
| --- | --- | --- | --- |
| M0 工程与设计基线 | monorepo、CI、环境、设计令牌、API 错误模型、数据库规范 | 全部 | 本地可启动，检查/构建通过，物理外键检查生效 |
| M1 品牌、内容与商品基础 | 旧站资产盘点、PIM、分类/属性、媒体、CMS、首页、公开产品页 | storefront/api/database | 运营可录入并发布产品、页面、文章、FAQ、Banner |
| M2 发现与转化 | 搜索、筛选、比较、推荐、经销商地图、支持、下载、联系表单 | storefront/api | 所有公开路由可访问、可追踪、可被正确索引 |
| M3 身份与用户中心 | 注册、验证、会话、地址、收藏、订单/售后入口、订阅、安全 | `apps/storefront/src/features/account` + API | 用户全流程、隐私同意、账户删除申请通过验收 |
| M4 经销商全流程 | 申请/审核/补件/激活、企业隔离、目录、价格、快速下单、报价、团队 | `apps/storefront/src/features/dealer` + `apps/storefront/src/features/admin` + API | 申请到经销商登录及企业内业务闭环可运行 |
| M5 B2C/B2B 交易 | 购物车、结算、价格、库存预占、订单、付款、发货、退款、退货 | storefront + api | B2C 开关两种模式和 B2B 审核型订单均通过端到端测试 |
| M6 运营后台 | Dashboard、商品、价格、库存、订单、经销商、用户、内容、表单、SEO、设置、权限、审计 | `apps/storefront/src/features/admin` + API | 附录 B 的 A-001 至 A-016 全部可用且按权限隔离 |
| M7 集成与运营数据 | 邮件、搜索、对象存储、ERP/WMS、支付、税务、物流、CRM、分析、报表 | `apps/storefront/src/features/admin` + API | Webhook 签名/幂等、失败重试、任务追踪和核心事件验证通过 |
| M8 迁移与上线 | 旧站资产/URL 迁移、可访问性、性能、安全、备份恢复、监控、UAT | 全部 | 第 21 章全部验收项通过并形成证据包 |

## 领域任务

### 1. 体验壳、市场与国际化

- 完成桌面/移动头部、Mega Menu、搜索入口、账号识别、购物车、公告和页脚。
- 建立语言与市场分离模型，应用货币、可售范围、内容回退、翻译状态和 `hreflang`。
- 建立 WCAG 2.2 AA 组件规范、响应式断点、表单错误/焦点/上传反馈。
- 对应：`apps/storefront/src/features/platform`、`apps/storefront/src/features/public-site`、`packages/ui/src/navigation`、`apps/api/src/modules/localization`、`apps/api/src/modules/settings`。

### 2. 商品、分类、媒体与公开展示

- 建立 Product/Variant/SKU、分类层级、属性模板、筛选属性、标签、关联产品和发布状态。
- 完成产品列表、分类、新品、详情、媒体画廊、变体、规格、玩法、安全、FAQ、下载、比较和推荐。
- 管理端支持 CRUD、复制、归档、批量上下架/导入导出、变更历史和发布流程。
- 对应：`apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`、`apps/api/src/modules/catalog`、`apps/api/src/modules/media`。

### 3. CMS、内容、支持与 SEO

- 建立 Page/Article/FAQ/Banner/Download/Navigation 内容模型、多语言版本、草稿预览、定时发布和版本记录。
- 完成玩法文章、支持中心、FAQ、下载、联系、About、质量安全和法律页面。
- 输出可编辑元信息、canonical、OG、结构化数据、Sitemap、robots、重定向与 404 管理。
- 对应：`apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`、`apps/api/src/modules/cms`、`apps/api/src/modules/seo`。

### 4. 搜索、筛选、推荐与分析

- 统一搜索产品、文章、FAQ、下载；实现容错、分词、同义词、权重、建议和无结果体验。
- URL 保存筛选/排序/分页状态；推荐结果执行发布、区域、授权和库存过滤。
- 采集需求列出的核心事件并建立产品、经销商、内容、搜索、销售、线索报表。
- 对应：`apps/storefront/src/features/public-site`、`apps/storefront/src/features/admin`、`apps/api/src/modules/search`、`apps/api/src/modules/analytics`。

### 5. 身份、账户与权限

- 区分普通用户、经销商成员/管理员和后台员工登录受众；实现邮箱验证、找回密码、会话、MFA 策略和重新认证。
- RBAC 达到模块+动作粒度，支持内部账号级权限增减；经销商权限叠加企业数据边界。
- 完成用户资料、地址、收藏、订阅、安全、数据导出/删除申请以及后台用户管理。
- 对应：`apps/storefront/src/features/account`、`apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`、`apps/api/src/modules/auth`、`apps/api/src/modules/identity`。

### 6. 经销商申请与企业管理

- 分步申请、草稿自动保存、邮箱验证、资质私有上传、重复提示、协议版本/IP 留存。
- 实现 Submitted/Under Review/Approved/Rejected 与企业 Active/Suspended/Closed 流程及完整历史。
- 完成企业资料、门店公开、地址、等级、价格表、区域、授权分类、销售代表和成员邀请/权限。
- 对应：`apps/storefront/src/features/public-site`、`apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`、`apps/api/src/modules/dealers`。

### 7. 价格与库存

- 实现市场/币种、零售价/促销、企业专属价 > 价格表 > 等级价 > 默认 B2B 价、阶梯价和有效期。
- 订单/报价固化价格来源与金额快照；批量改价保留审计和结果。
- 管理 Physical/Available/Reserved、多仓/市场、预占与释放、展示粒度和同步失败降级。
- 对应：`apps/api/src/modules/pricing`、`apps/api/src/modules/inventory`、`apps/storefront/src/features/admin`。

### 8. 购物车、结算与订单履约

- 游客购物车与登录合并；B2C 关闭时转为 Where to Buy/Contact。
- 结算明确展示商品、折扣、税、运费；库存双重校验；支付会话与回调幂等。
- B2B 支持 MOQ/倍数/箱规、SKU 粘贴/CSV 快速下单、PO、账期、人工确认、拆单和复购。
- 后台支持人工订单、限制性修改、付款、取消、部分/全部退款、分批发货和敏感导出。
- 对应：`apps/storefront/src/features/account`、`apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`、`apps/api/src/modules/cart`、`apps/api/src/modules/orders`、`apps/api/src/modules/payments`、`apps/api/src/modules/returns`。

### 9. 报价

- 经销商从商品或购物车发起请求；平台维护含运税、条款、交期和有效期的版本化报价。
- Accepted 后按报价快照转单；拒绝/过期不可直接转单；全状态通知和审计。
- 对应：`apps/storefront/src/features/dealer`、`apps/storefront/src/features/admin`、`apps/api/src/modules/quotes`。

### 10. 表单、线索、通知与文件

- 联系/产品/订单/经销商/订阅表单统一进入线索中心，支持分配、优先级、标签、备注和状态历史。
- 登录、表单、搜索等入口限流并接入风险评分/验证码 adapter。
- 事务邮件多语言、变量完整性校验、状态追踪和重试；营销退订不影响事务邮件。
- 文件按 Public/Registered/Dealer/Internal 授权，私有文件使用短期签名 URL 和版本记录。
- 对应：`apps/api/src/modules/forms`、`apps/api/src/modules/notifications`、`apps/api/src/modules/media`、`apps/storefront/src/features/admin`、`apps/storefront/src/features/dealer`。

### 11. 集成、后台设置与可观测性

- 为支付、邮件、对象存储、搜索、ERP/WMS、税务、物流、分析、CRM 建立 adapter 契约和配置面。
- Webhook 验签、防重放、幂等、重试、告警和人工补偿；批量任务有状态与失败明细。
- 统一 request_id、结构化日志、APM、前端错误、API/数据库/队列与业务指标监控。
- 对应：`apps/api/src/modules/integrations`、`apps/api/src/modules/jobs`、`apps/api/src/modules/settings`、`apps/storefront/src/features/admin`。

### 12. 迁移、质量与上线

- 以 `www.wemovetoy.com` 为旧站公开资产与 URL 清单来源；先盘点/去重/映射，再由品牌方确认后导入。
- 建立 Development、Staging/UAT、Production 环境，测试环境禁止索引，生产具备备份、恢复、监控和回滚。
- 覆盖主流浏览器/设备、WCAG、Core Web Vitals、权限越权、上传/富文本/Webhook 和完整角色 UAT。
- 对应：`scripts`、部署配置、各工作区测试目录和 `requirements-traceability.md` 证据列。

## 横向验收门禁

- 需求覆盖：`pnpm check:requirements`。
- 静态质量：所有包 TypeScript strict 类型检查。
- 数据库：Prisma schema 使用自增整数主键和整数逻辑 ID；schema/migration 文本不得出现 Prisma 物理关系、`.references(`、`FOREIGN KEY` 或 SQL `REFERENCES`。
- 业务测试：状态机、价格优先级、库存预占、支付/Webhook 幂等和企业隔离必须使用真实应用入口测试。
- 前端质量：关键路由包含键盘、移动断点、无障碍、SSR/SEO 和性能测试。
- 交付证据：追踪矩阵逐项填写自动化测试、人工 UAT、截图/报告或监控验证链接。
