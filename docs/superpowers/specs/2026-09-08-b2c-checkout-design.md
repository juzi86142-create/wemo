# WEMOVE B2C 真实交易链路设计

## 目标

在现有消费者前台视觉和 API 边界上，完成从真实购物车到 B2C 结算、订单创建和成功反馈的第一条可用交易链路。实现必须继续以 `82c9102` 的 `/api/v1` 接口和 `@wemo/contracts` 为唯一数据契约，不新增后端 endpoint，不把开发预览数据当成成功订单。

## 已确认的决策

- 允许游客结算。
- 登录用户进入结算时预填账户资料；已有地址可以作为收货地址候选。
- API 未配置、购物车处于 preview 模式或购物车不可用时，不允许伪造下单成功。
- 商品、价格、库存、优惠码、订单状态和最终金额以后端响应为准。
- 支付供应商接入不属于本阶段；结算请求使用已有 `payment_method` 字段承载后端允许的值，未配置支付时仍展示后端返回的订单状态。
- 当前 cart controller 只有 GET `/cart`、POST `/cart/items` 和 POST `/cart/merge`。前端不会发明删除 endpoint；真实模式下缺少删除能力时继续显示受控错误，preview 模式保留本地删除体验。

## 范围

### 本阶段实现

- `/checkout`：购物车读取、联系人、收货地址、可选优惠码、备注、提交中/失败/成功状态。
- `/order/success`：展示 checkout 返回的订单摘要、订单号、状态和回到账户/商品的链接；刷新或直接访问但没有安全的成功快照时显示解释性空态。
- `features/commerce/checkout-adapter.ts`：使用 `CheckoutCreateSchema` 解析输入，调用 POST `/checkout`，使用 `OrderMutationResponseSchema` 解析响应。
- `features/commerce/checkout-form.tsx`：客户端表单、字段校验、提交锁、API 错误和后端字段错误反馈。
- 购物车到结算的真实模式判断：preview/cart unavailable 不进入伪造订单流程。
- 登录用户资料/地址预填，不把客户端提交的 user id 作为权限依据。
- 成功提交的客户端交接：将经过 `OrderSchema` 验证的 checkout 返回订单摘要临时放入 `sessionStorage`，再导航到 `/order/success`；不把地址、支付信息或完整订单快照放进 URL。
- 页面浏览、开始结算、提交订单成功/失败事件；事件不包含密码、完整地址或支付信息。

### 明确不包含

- 支付网关、真实支付页面、支付回调和退款 UI。
- 新增或修改 API endpoint、数据库 schema、后端订单规则。
- 游客订单查询 endpoint；游客成功页只依赖本次 checkout 返回的临时摘要。
- 购物车删除接口的前端假实现。

## 页面与数据流

### `/checkout` 服务端装配

1. 调用 `getCart()`。
2. `cart === null` 时显示错误状态和返回购物车入口。
3. `preview === true` 时显示 preview/unavailable 状态，不渲染可提交的真实订单按钮。
4. 尝试调用 `getSession()`；未登录不阻止游客结算。
5. 登录用户调用已有 `getProfile()` 和 `getAddresses()` 读取预填值；任一读取失败只影响预填，不吞掉结算页面本身。
6. 将 `Cart`、可选 profile、可选地址和错误状态作为 props 传入 `CheckoutForm`。

### `CheckoutForm` 客户端流程

1. 初始表单从 session/profile/address props 建立，但最终输入由用户控制。
2. 提交前通过本地表单校验，再用 `CheckoutCreateSchema.parse` 形成请求输入。
3. 请求体的 `items` 从当前购物车行的 `variant_id` 与 `quantity` 生成；客户端不提交价格。
4. 调用 `createCheckout(input)`，由 adapter 请求 `/api/v1/checkout` 并解析 `OrderMutationResponseSchema`。
5. 请求期间锁定提交按钮，保留用户输入，防止重复提交。
6. API 错误显示通用消息、字段错误和 `request_id`（如存在）；不把服务端错误转成成功反馈。
7. 成功时只保存经过 schema 验证的订单摘要到 `sessionStorage`，然后使用 Next router 进入 `/order/success`。

### `/order/success`

- 客户端读取并再次解析 `sessionStorage` 中的订单摘要。
- 显示订单号、状态、商品行、总额和下一步链接。
- 读取不到摘要、摘要解析失败或用户直接访问时显示安全空态，不请求不存在的游客订单读取接口。
- 登录用户提供 `/account/orders` 链接；所有用户提供 `/products` 和首页链接。

## 组件边界

- `checkout-adapter.ts` 只负责 contract parse、`requestJson` 和 API 错误，不负责表单状态或页面跳转。
- `checkout-form.tsx` 只负责用户输入、状态和成功交接，不自行计算服务端价格。
- `checkout/page.tsx` 负责服务端数据读取和状态装配。
- `order/success/page.tsx` 负责成功快照读取和安全空态。
- `CartSummary` 的结算链接继续指向 `/checkout`；preview 状态由 `CartView`/结算页共同明确提示。

## 视觉与交互

- 继承现有 Kinetic Editorial tokens：暖白画布、白色表面、深海军蓝、低比例蓝/珊瑚/荧光绿强调、细线、轻圆角和现有 Hanken Grotesk 字体栈。
- 结算使用“左侧表单 + 右侧订单摘要”的桌面布局，小屏改为先表单、后摘要的单列布局。
- 必填字段有原生 label、`aria-invalid`、关联错误文本和清晰 focus-visible 状态。
- 订单摘要只展示后端购物车金额；提交成功后以订单响应金额为准，不显示客户端推算的“最终价格”。
- 预览/不可用/错误/成功状态使用现有 status panel 和 banner 语言，不显示 prototype brace tokens。

## 错误与边界

- API 未配置或网络失败：结算不可提交，展示服务不可用和返回购物车操作。
- 空购物车：展示空态，不渲染结算表单。
- 401/403：游客仍可提交 B2C；如果后端要求登录，则显示后端错误并提供登录入口，不擅自改变权限。
- 422：把 `field_errors` 映射到对应字段，未知字段落到表单级错误。
- 库存不足、商品不可售、优惠码无效：保留用户输入，显示后端错误，允许返回购物车修正。
- 重复提交：按钮锁定；后端的 request_id 幂等响应按同一 `OrderMutationResponseSchema` 处理。
- 成功页快照失效：显示安全空态，不尝试从 URL 恢复敏感内容。

## 测试与验收

由于 storefront 当前 Vitest 没有 JSX transform、React Testing Library 或 jsdom，测试分层如下：

- 纯 TypeScript adapter 测试：schema 输入、API path、错误传播和订单响应解析。
- 纯表单校验测试：必填联系人、邮箱、地址、优惠码和备注边界。
- server HTML 检查：`/checkout` 的 preview/unavailable/主要标题和 `/order/success` 空态不出现原型占位符。
- 浏览器检查：购物车跳转、游客表单、移动单列布局、键盘焦点、提交中、错误和成功摘要。
- 最终门禁：

```text
pnpm --filter @wemo/contracts build
pnpm --filter @wemo/storefront typecheck
pnpm --filter @wemo/storefront test
pnpm --filter @wemo/storefront build
```

## 交付门槛

- 真实 API 配置下，checkout 请求严格符合 `CheckoutCreateSchema`，成功响应严格符合 `OrderMutationResponseSchema`。
- preview 或 API 不可用时不会创建或伪造成功订单。
- 登录/游客两种入口均有明确状态；订单成功后可返回商品页，登录用户可进入订单列表。
- 桌面和移动端无横向溢出，表单标签/错误/焦点完整，金额以 API 响应为准。
- 设计、实现、验证证据和需求追踪状态同步提交。
