# 需求覆盖与追踪矩阵

## 状态规则

当前全部条目状态为 `planned`，表示已经分配到模块但尚未宣称实现。后续只允许按 `planned -> in-progress -> done` 更新；`done` 必须附代码位置、自动化测试或人工验收证据。

## 正文章节覆盖

| 来源 | 责任模块 | 主要验收物 | 状态 |
| --- | --- | --- | --- |
| 需求第 1 章：目标与定位 | 全部应用、`ui`、架构文档 | 动态运营、角色隔离、移动优先和配置化评审 | planned |
| 需求第 2 章：角色权限 | `api/auth`、`api/identity`、`storefront/features/admin` | RBAC、企业边界、审计和登录策略测试 | planned |
| 需求第 3 章：信息架构 | 唯一 React 应用的四个路由区域 | 页面路由与导航自动化巡检 | planned |
| 需求第 4 章：前台官网 | `storefront/*` 与对应 API | P/FE/HOME/PLP/PDP/CNT/DLR/CT 全量验收 | planned |
| 需求第 5 章：用户中心 | `storefront/account`、`storefront/commerce`、身份与订单 API | 用户账户和 B2C 全流程 | planned |
| 需求第 6 章：经销商中心 | `storefront/features/dealer` 与 dealers/pricing/quotes/orders API | 经销商企业隔离全流程 | planned |
| 需求第 7 章：管理后台 | `storefront/features/admin` 与全部管理 API | A-001 至 A-016 权限化运营能力 | planned |
| 需求第 8 章：状态机 | dealers/catalog/orders/quotes | 状态转换、拒绝非法转换、历史记录测试 | planned |
| 需求第 9 章：商品价格库存订单 | catalog/pricing/inventory/orders | 唯一性、价格优先级、预占与金额快照测试 | planned |
| 需求第 10 章：内容媒体资料 | cms/media 与内容前端 | 内容模型、图片处理、四级文件权限 | planned |
| 需求第 11 章：搜索推荐 | search/analytics 与搜索前端 | 搜索质量、授权过滤、无结果分析 | planned |
| 需求第 12 章：多语言 SEO 分享 | localization/seo 与 storefront | 翻译状态、URL、hreflang、Schema、Sitemap | planned |
| 需求第 13 章：UI/UX | `packages/ui` 与唯一 React 应用 | 组件、响应式、表单、WCAG 2.2 AA | planned |
| 需求第 14 章：数据模型 | `packages/database`、`packages/contracts` | 核心实体/字段字典；零物理外键 | planned |
| 需求第 15 章：接口集成 | `api/integrations`、contracts | Adapter、版本 API、错误结构、幂等任务 | planned |
| 需求第 16 章：安全隐私合规 | auth/identity/media/payments/forms | OWASP、隐私同意、儿童数据禁收、PCI 范围确认 | planned |
| 需求第 17 章：性能可用性运维 | 全部应用、基础设施 | CWV、P95、缓存、备份恢复、监控告警 | planned |
| 需求第 18 章：数据分析 | analytics/reports | 事件字典与六类运营报表 | planned |
| 需求第 19 章：通知 | notifications | 多语言模板、变量校验、追踪重试与收件组 | planned |
| 需求第 20 章：迁移上线 | 迁移脚本与部署配置 | `www.wemovetoy.com` 资产/URL 盘点、映射、环境和上线清单 | planned |
| 需求第 21 章：验收 | 全部工作区测试 | 功能、兼容性、无障碍、性能、安全证据包 | planned |
| 需求第 22 章：技术架构 | 根工程、单前端、单体 API、共享包 | 前后端分离、SSR、PostgreSQL、Redis、存储、监控 | planned |
| 需求附录 A：权限矩阵 | identity/dealers/orders/content | 权限矩阵自动化测试 | planned |
| 需求附录 B：页面功能清单 | 唯一 React 应用 | 全路由清单及角色访问测试 | planned |
| 需求附录 C：核心 API | `apps/api`、contracts | API 版本、OpenAPI 与契约测试 | planned |
| 需求附录 D：状态枚举 | contracts 与各业务模块 | 共享枚举和状态机测试 | planned |
| 需求附录 E：实施重点 | 计划、迁移、设计系统、UAT | 代表页设计评审和全角色 UAT | planned |

## 页面 ID 覆盖

| 区域 | ID | 责任模块 | 状态 |
| --- | --- | --- | --- |
| 公开前台 | `P-001`, `P-010`, `P-011`, `P-012`, `P-013`, `P-014`, `P-020`, `P-021`, `P-030`, `P-031`, `P-032`, `P-040`, `P-041`, `P-042`, `P-043`, `P-050`, `P-051`, `P-060`, `P-070`, `P-071`, `P-072`, `P-080`, `P-081`, `P-082` | `storefront/features/public-site` | planned |
| 用户中心 | `U-001`, `U-002`, `U-003`, `U-004`, `U-005`, `U-006`, `U-007` | `storefront/features/account` | planned |
| 经销商中心 | `D-001`, `D-002`, `D-003`, `D-004`, `D-005`, `D-006`, `D-007`, `D-008`, `D-009` | `storefront/features/dealer` | planned |
| 管理后台 | `A-001`, `A-002`, `A-003`, `A-004`, `A-005`, `A-006`, `A-007`, `A-008`, `A-009`, `A-010`, `A-011`, `A-012`, `A-013`, `A-014`, `A-015`, `A-016` | `storefront/features/admin` | planned |

## 显式功能 ID 覆盖

| 需求组 | ID | 前端责任 | 后端责任 | 状态 |
| --- | --- | --- | --- | --- |
| 全站头部 | `FE-001`, `FE-002`, `FE-003`, `FE-004`, `FE-005`, `FE-006` | `storefront/shell` | cms/search/auth/localization | planned |
| 首页 | `HOME-001`, `HOME-002`, `HOME-003`, `HOME-004`, `HOME-005`, `HOME-006`, `HOME-007` | public-site、admin | cms/media/analytics | planned |
| 商品列表 | `PLP-001`, `PLP-002`, `PLP-003`, `PLP-004`, `PLP-005`, `PLP-006`, `PLP-007`, `PLP-008` | `storefront/catalog` | catalog/pricing/inventory/search/seo | planned |
| 商品详情 | `PDP-001`, `PDP-002`, `PDP-003`, `PDP-004`, `PDP-005`, `PDP-006`, `PDP-007`, `PDP-008`, `PDP-009`, `PDP-010`, `PDP-011`, `PDP-012`, `PDP-013`, `PDP-014` | `storefront/catalog` | catalog/pricing/inventory/media/cms/dealers/seo | planned |
| 内容 | `CNT-001`, `CNT-002`, `CNT-003`, `CNT-004`, `CNT-005`, `CNT-006` | public-site、admin | cms/seo | planned |
| 经销商地图 | `DLR-001`, `DLR-002`, `DLR-003`, `DLR-004`, `DLR-005` | `storefront/dealers` | dealers/seo | planned |
| 联系表单 | `CT-001`, `CT-002`, `CT-003`, `CT-004`, `CT-005` | public-site、admin | forms/notifications | planned |
| 用户中心 | `USR-001`, `USR-002`, `USR-003`, `USR-004`, `USR-005`, `USR-006`, `USR-007`, `USR-008`, `USR-009`, `USR-010` | `storefront/account` | auth/identity/orders/returns/notifications | planned |
| 经销商目录 | `B2B-001`, `B2B-002`, `B2B-003`, `B2B-004`, `B2B-005`, `B2B-006`, `B2B-007` | dealer catalog/quick-order/documents | dealers/catalog/pricing/inventory/orders/media | planned |
| 报价 | `QTE-001`, `QTE-002`, `QTE-003`, `QTE-004`, `QTE-005`, `QTE-006` | dealer/admin quotes | quotes/orders/notifications | planned |
| B2B 订单 | `ORD-B2B-001`, `ORD-B2B-002`, `ORD-B2B-003`, `ORD-B2B-004`, `ORD-B2B-005`, `ORD-B2B-006`, `ORD-B2B-007` | dealer/admin orders | orders/payments/inventory/media | planned |
| 后台商品 | `ADM-P-001`, `ADM-P-002`, `ADM-P-003`, `ADM-P-004`, `ADM-P-005`, `ADM-P-006`, `ADM-P-007`, `ADM-P-008`, `ADM-P-009`, `ADM-P-010` | storefront admin | catalog/media/audit/jobs | planned |
| 后台价格 | `ADM-PR-001`, `ADM-PR-002`, `ADM-PR-003`, `ADM-PR-004`, `ADM-PR-005` | storefront admin | pricing/audit/jobs | planned |
| 后台订单 | `ADM-O-001`, `ADM-O-002`, `ADM-O-003`, `ADM-O-004`, `ADM-O-005`, `ADM-O-006`, `ADM-O-007`, `ADM-O-008` | storefront admin | orders/payments/returns/audit/jobs | planned |
| 后台经销商 | `ADM-D-001`, `ADM-D-002`, `ADM-D-003`, `ADM-D-004`, `ADM-D-005`, `ADM-D-006`, `ADM-D-007` | storefront admin | dealers/pricing/audit/jobs | planned |
| 后台内容 | `ADM-C-001`, `ADM-C-002`, `ADM-C-003`, `ADM-C-004`, `ADM-C-005`, `ADM-C-006` | storefront admin | cms/media/seo/audit/jobs | planned |
| 搜索 | `SEA-001`, `SEA-002`, `SEA-003`, `SEA-004`, `SEA-005`, `SEA-006`, `SEA-007` | `storefront/search` | search/analytics | planned |
| SEO | `SEO-001`, `SEO-002`, `SEO-003`, `SEO-004`, `SEO-005`, `SEO-006`, `SEO-007`, `SEO-008` | storefront/admin seo | seo/cms/catalog | planned |
| 安全 | `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `SEC-005`, `SEC-006`, `SEC-007`, `SEC-008` | 单前端四区域安全交互 | auth/identity/forms/media/audit/integrations | planned |
| 性能 | `PERF-001`, `PERF-002`, `PERF-003`, `PERF-004`, `PERF-005`, `PERF-006` | 唯一前端 | api/media/cache/observability | planned |
| 最终功能验收 | `ACC-001`, `ACC-002`, `ACC-003`, `ACC-004`, `ACC-005`, `ACC-006`, `ACC-007`, `ACC-008`, `ACC-009`, `ACC-010` | 全部 | 全部 | planned |

## 未编号要求的验收索引

| 要求簇 | 责任位置 | 必备证据 |
| --- | --- | --- |
| 经销商、产品、B2C/B2B 订单、报价状态机 | contracts + 对应 API 模块 | 合法/非法转换与并发测试 |
| 商品字段字典、经销商字段字典与核心实体 | database/contracts | schema 审查、接口契约测试 |
| 价格优先级、阶梯价、库存预占、税运费快照 | pricing/inventory/orders | 规则表驱动单元测试和真实结算入口测试 |
| 四级文件权限、版本与签名 URL | media | 越权下载与过期 URL 测试 |
| 邮件模板、通知触发与失败重试 | notifications/jobs | 模板快照、队列重试与状态记录测试 |
| 核心分析事件与六类运营报表 | analytics/admin reports | 事件契约、去重和报表核对 |
| 迁移、环境、上线检查、备份恢复 | scripts/部署文档 | 迁移对账、UAT、恢复演练记录 |
| 浏览器、移动设备、无障碍、性能与安全 | 全部测试套件 | 自动报告 + 人工抽检记录 |

## 证据登记模板

实现时在对应行增加“证据”列或链接到测试报告，至少写明：代码入口、测试用例、执行环境、结果日期、验收人。仅创建目录或 README 不构成功能完成证据。
