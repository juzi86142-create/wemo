# WEMOVE 后端测试交接清单

日期：2026-09-08

前端基线：`82c91027a656c57b78486eb004417c5931c973ad`

当前分支：`feat/storefront-consumer-phase`

## 交接结论

前端页面和 API 契约边界已完成，可交给后端进行真实环境联调。压缩包中的 kinetic editorial 视觉基线已复用到现有唯一 storefront：暖白画布、深蓝文字、coral/blue/lime 强调色、低圆角卡片、响应式断点和公开页面结构均保留在 `apps/storefront`，没有另建第二套前端。

## 前端门禁结果

| 检查 | 结果 |
| --- | --- |
| `pnpm --filter @wemo/storefront test` | 16 个测试文件、37 项通过 |
| `pnpm --filter @wemo/storefront typecheck` | 通过 |
| `pnpm --filter @wemo/contracts build` | 通过 |
| `pnpm typecheck` | 5 个 workspace package 全部通过 |
| `pnpm build` | API、contracts、database、ui、storefront 全部构建通过 |
| `pnpm check:requirements` | 212 个显式需求/页面 ID、22 个正文章节、5 个附录登记通过 |
| `pnpm check:architecture` | 通过；唯一 React 前端、workspace 依赖方向、模块 README 检查通过 |
| `pnpm check:database` | 通过；未发现 Prisma/SQL 物理外键 |
| Storefront HTTP 冒烟 | 18 条路由全部 HTTP 200，无 `{Product}`、`{Price}`、`{Count}` 占位符 |

路由范围：`/`、`/products`、`/products/roll-play-bowling-set`、`/search?q=bowling`、`/support`、`/login`、`/register`、`/forgot-password`、`/account`、`/account/profile`、`/account/addresses`、`/account/orders`、`/account/orders/missing`、`/cart`、`/checkout`、`/order/success`、`/dealers`、`/dealers/apply`。

## 后端真实集成结果

`pnpm --filter @wemo/api test` 当前为 `10 passed、1 skipped、8 failed`。8 项失败均来自真实依赖不可用，不是前端契约失败：

- `health check`：返回 503，PostgreSQL timeout、Redis connection refused。
- localization languages/markets：返回 500。
- catalog products：返回 500。
- staff MFA login：返回 500，无法读取 Redis challenge。
- bearer audit log：依赖 MFA 登录失败。
- dealer company：登录响应没有 token。
- B2C checkout：登录响应没有 token。

`pnpm check:runtime` 同样只能在 API 构建成功后启动进程，但健康检查无法得到 PostgreSQL/Redis 均为 `up` 的响应。当前监听状态只有 storefront `3000`；API `4000`、PostgreSQL `5432`、Redis `6379`、MinIO `9000`、Mailpit `1025` 均未监听。

## 后端启动后验收顺序

1. 启动 PostgreSQL、Redis，以及项目配置中的 MinIO/Mailpit；确认 `5432`、`6379`、`9000`、`1025` 可连接。
2. 在仓库根目录执行 `pnpm --filter @wemo/database db:generate`，再执行项目既有 migration/seed 流程，确保 `admin@wemove.com`、`dealer@example.com`、`user@example.com` 与测试密码存在。
3. 执行 `pnpm --filter @wemo/api test`，先清除 8 项真实集成失败。
4. 启动 API `4000`，健康检查必须返回 `database.status=up`、`redis.status=up`。
5. 启动 storefront：`WEMO_API_ORIGIN=http://127.0.0.1:4000 pnpm --filter @wemo/storefront dev`。
6. 复测 `/products`、`/search`、`/cart`、`/checkout`、`/dealers`、`/dealers/apply`，确认响应来自真实 API；不要启用 `NEXT_PUBLIC_WEMO_CONTRACT_MOCK=true` 作为真实验收证据。

## 重点接口映射

| 页面/流程 | 后端接口 |
| --- | --- |
| 商品列表/详情 | `GET /api/v1/catalog/products`、`GET /api/v1/catalog/products/:slug` |
| 搜索 | `GET /api/v1/search` |
| 登录/账户 | `POST /api/v1/auth/login`、`POST /api/v1/auth/mfa/verify`、`GET /api/v1/account/profile` |
| 购物车/结算 | `GET /api/v1/cart`、`POST /api/v1/cart/items`、`POST /api/v1/checkout` |
| 公开经销商 | `GET /api/v1/dealer/public-listings`、`POST /api/v1/dealer/applications` |

前端会对请求输入和响应分别使用 `@wemo/contracts` schema 校验；接口失败会显示错误和 `request_id`，不会生成假商品、假门店、假订单或假申请编号。

## 交付位置

- 前端输出目录：`C:\Users\yy\Desktop\新建文件夹 (2)\wemo-82c9102-frontend`
- 页面验证：[2026-09-07-storefront-consumer-phase.md](./2026-09-07-storefront-consumer-phase.md)
- B2C 验证：[2026-09-08-b2c-checkout.md](./2026-09-08-b2c-checkout.md)
- 公开经销商验证：[2026-09-08-public-dealer-entry.md](./2026-09-08-public-dealer-entry.md)
