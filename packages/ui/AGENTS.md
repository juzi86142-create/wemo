# UI 包说明

## 角色

`@wemo/ui` 提供唯一前端应用内部跨区域共享的设计令牌、基础控件和领域展示组件。它不请求 API、不读取登录态、不决定价格/权限，也不包含具体页面文案。

## 组件区域

- `tokens`：品牌颜色、排版、间距、圆角、阴影、断点和动效时长。
- `primitives`：Button、表单控件、Drawer、Dialog、Tabs、Pagination 等无业务组件。
- `navigation`：Header、Mega Menu、Breadcrumb 和区域导航壳。
- `commerce`：Product Card、Price、Variant、Quantity、Cart Item、Order Summary。
- `content`：Hero、Card、Accordion、FAQ、Rich Text、Media Gallery、Download Item。
- `b2b`：Quick Order Table、Price Tier、Quote Status、Dealer Badge。
- `feedback`：Toast、Alert、Inline Error、Empty State、Skeleton、Progress。

## 约束

- 所有交互支持键盘、清晰焦点、可访问名称和减少动效；颜色不是唯一状态表达。
- Props 保持组合式和最小化，不为未确认场景堆叠配置。
- 业务 feature 先组合现有 primitive；只有跨两个以上区域稳定复用后才提升到此包。
- 组件完成必须包含状态矩阵、无障碍测试和至少一个真实 feature 使用证据。
