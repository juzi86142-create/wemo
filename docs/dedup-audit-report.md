# apps/api 重复造轮子审计报告

- 日期：2026-09-07
- 范围：`apps/api/src` 全部 143 个 TS 文件（24 个 service、12+ 个使用 Redis 的 repository、28 个 controller）
- 方式：只读审查，未修改任何代码。对 8 类目标模式逐一全文扫描，行号来自匹配结果。
- 前提（已完成的去重，未重复报告）：bootstrap/Fastify 原生选项、WemoHttpException 统一异常、AuditRepository 复用、RequestContextStore.enterWith 已就位。

## 结论速览

| # | 类别 | 出现次数 | 严重度 |
|---|------|---------|--------|
| 1 | 手写 JSON 序列化循环（hgetall/entries/parse） | 16 处读循环 + 约 25 处写、约 10 处单值读 | 中 |
| 2 | 手写内存 filter + slice 分页 | 11 个 list 方法、12 处 slice | 中 |
| 3 | zod 参数解析绕过 parseInput | 7 处（集中在 localization.service） | 高 |
| 4 | 手写响应包装绕过契约 Schema | 系统性旁路 0 处；信封重复构造 12 处 | 低 |
| 5 | 手写权限检查绕过 AuthorizationService | 1 处真旁路 + 1 处可简化 | 高 |
| 6 | 手写时间戳 / 随机数 / 单号生成 | 3 份 nowIso 定义 + 约 25 处内联 now + 3 套单号生成器 | 中 |
| 7 | NestJS 能力未复用 | 无显著项（已达标） | — |
| 8 | ioredis 能力未复用 | KEYS+正则解析 ID 1 处、N+1 往返、String() 冗余 | 高 |

---

## 1. 手写 JSON 序列化循环（16 读 + 25 写 + 10 单读）

模式：`redis.hgetall(key)` → `Object.entries(raw).map(([, v]) => JSON.parse(v) as T)`，几乎每个 Redis 存储模块复制一遍，decode 目标类型靠手写 as 断言。

完整清单（9 个文件）：

- `apps/api/src/modules/cart/cart.redis-repository.ts:306`、`:348-350`（连同 loadCart 298-306 内 2 次 hgetall）
- `apps/api/src/modules/identity/identity.prisma-repository.ts:96-98`、`:136-138`、`:301-303`、`:369-371`（4 处，同一文件最集中）
- `apps/api/src/modules/jobs/jobs.redis-repository.ts:23-25`、`:99-101`
- `apps/api/src/modules/notifications/notifications.redis-repository.ts:31-33`、`:118-120`
- `apps/api/src/modules/integrations/integrations.redis-repository.ts:59-61`、`:153-155`
- `apps/api/src/modules/forms/forms.prisma-repository.ts:64-67`（含 sort）
- `apps/api/src/modules/inventory/inventory.prisma-repository.ts:67-69`
- `apps/api/src/modules/dealers/dealers.prisma-repository.ts:392-394`
- `apps/api/src/modules/reports/reports.redis-repository.ts:119(130-131)`
- 变体：`apps/api/src/modules/analytics/analytics.redis-repository.ts:74`、`:103`（lrange 每行 JSON.parse）

同族（写侧与单值读）：
- 写：`hset(key, String(id), JSON.stringify(obj))` 约 25 处，代表如 cart.redis-repository.ts:179/218、identity.prisma-repository.ts:119/153/170/295、jobs.redis-repository.ts:64/93/164、notifications.redis-repository.ts:76/101/174/204、reports.redis-repository.ts:83/113/125、integrations.redis-repository.ts:41/96/137、inventory.prisma-repository.ts:151/185、dealers.prisma-repository.ts:415、forms.prisma-repository.ts:51/98、auth.prisma-repository.ts:196/223
- 单值读：`raw ? JSON.parse(raw) as T : null` 约 10 处，如 forms.prisma-repository.ts:58、integrations.redis-repository.ts:49、jobs.redis-repository.ts:32、notifications.redis-repository.ts:111/184、inventory.prisma-repository.ts:107/163

建议：在 `apps/api/src/runtime/` 新增一个类型化 Redis-hash helper（例如 `redis-hash.ts`），替代散落在各 repo 的裸 JSON 读写：

```ts
// 设计草案
export async function readAllHash<T>(
  client: Redis, key: string, decode: (raw: string) => T,
): Promise<T[]>;
export async function readHashOne<T>(
  client: Redis, key: string, field: string | number,
  decode: (raw: string) => T,
): Promise<T | null>;
export function writeHashObject(
  client: Redis, key: string, field: string | number, value: unknown,
): Promise<number>;  // 内部 JSON.stringify
```

各模块的 contracts zod schema 已存在，decode 参数直接传 `(raw) => XxxSchema.parse(JSON.parse(raw))` 即可消除全部 as 断言。新模块接入 Redis 时不再复制循环。若顺带把 sort 也收编，可提供 `sortBy(key)` 选项，与第 2 类合并。

---

## 2. 手写内存 filter + slice 分页（11 个 list 方法 / 12 处 slice）

模式：把整个 Redis hash（或全表）读出 → 逐字段 `if (q.xxx !== undefined && r.xxx !== q.xxx)` 过滤 → `start = (page-1)*page_size` → `items.slice(start, start+page_size)`，每处 8-15 行手写；契约里相同的 list query 字段（page/page_size/status/audience…）重复实现。

代表清单（最多 8）：

- `apps/api/src/modules/cart/cart.redis-repository.ts:126-144`
- `apps/api/src/modules/identity/identity.prisma-repository.ts:369-391`
- `apps/api/src/modules/inventory/inventory.prisma-repository.ts:68-92`
- `apps/api/src/modules/notifications/notifications.redis-repository.ts:118-141`（另有 31-37 无过滤切片）
- `apps/api/src/modules/jobs/jobs.redis-repository.ts:99-116`
- `apps/api/src/modules/integrations/integrations.redis-repository.ts:153-163`（另有 59-66）
- `apps/api/src/modules/analytics/analytics.redis-repository.ts:74-90`
- `apps/api/src/modules/search/search.prisma-repository.ts:65-76`（JSON.stringify 全量 JSON 做 includes 的内存搜索）

另：forms.prisma-repository.ts:64-75、reports.redis-repository.ts:37-42/130-131、identity.prisma-repository.ts 还有一处。真正走数据库分页（Prisma skip/take，如 search.prisma-repository.ts:32-34、cms/audit/seo 等）的不在此列。

建议：新增 `runtime/pagination.ts`（或并入 list-response.ts）：

```ts
export function paginate<T>(
  items: T[],
  query: { page: number; page_size: number },
  options?: { exact?: Partial<Record<keyof T, unknown>>; sortBy?: (a: T, b: T) => number },
): { items: T[]; total: number; page: number; page_size: number };
```

仓库只调 `paginate(list, query, { exact: { status, audience, company_id }, sortBy: 按时间倒序 })`，删除每处 10+ 行手写分支。更彻底的方案是此类 Redis 存储（如表单定义、通知投递）迁到 PostgreSQL，直接复用 Prisma 的 where/skip/take——Pagination 反模式根因是"整表读入内存"。

---

## 3. zod 参数解析绕过 parseInput（7 处，全部在 localization）

全库其余 service 一律 `parseInput(schema, input)`（统一抛 WemoHttpException 400 + field_errors），只有 localization 直接 `schema.parse(input)`，失败时抛裸 ZodError → 走全局 filter 变成 500，且响应不含契约定义的 `field_errors`，与全库错误语义不一致。

- `apps/api/src/modules/localization/localization.service.ts:45`、`:51`（PaginationSchema）
- `apps/api/src/modules/localization/localization.service.ts:66`（ResolveMarketContextQuerySchema）
- `apps/api/src/modules/localization/localization.service.ts:106`、`:118`（UpsertLanguageSchema / SaveMarketSchema）
- `apps/api/src/modules/localization/localization.service.ts:128-129`（SessionActorSchema / RequestIdSchema）

建议：以上全部改走 `parseInput(...)`（同文件即可 import）。仓库内 `localization.prisma-repository.ts:192` 对行内 settings 的 safeParse 属读侧防御校验，不算旁路，可保留。

---

## 4. 手写响应包装绕过契约 Schema（系统性旁路 0 处）

全库 service 出参均经 `XxxResponseSchema.parse(...)`（auth/catalog/cms/dealers/orders/… 24 个 service 全部命中），createListResponseSchema/createItemResponseSchema 的契约形状无被绕过。仅两处低危信封重复：

- `apps/api/src/modules/catalog/catalog.service.ts:181-182`：手写 `listResponse(items, 1, Math.max(items.length, 1))`——第三个参数复刻了 `runtime/list-response.ts:4` 的默认值逻辑，多余。
- 各 repository 返回的分页对象 `{ items, total, page, page_size }`（约 12 处，见第 2 类）与 service 层再次 `listResponse(...)` 重塑属于同一信封两处构造——若 repository 只返回 `{ items, total }`、由 `listResponse` 单点补 page/page_size，可消除双构造（第 2 类 helper 一并解决）。

建议：`runtime/list-response.ts` 作为唯一信封构造点；service 层统一 `Schema.parse(listResponse(items, page, page_size))`，repo 层不拼信封。

---

## 5. 手写权限检查绕过 AuthorizationService（1 真旁路 + 1 可简化）

全库 service 均已注入并调用 `AuthorizationService.requireStaffPermission/requireActor/...`。例外：

- 真旁路：`apps/api/src/modules/localization/localization.service.ts:124-142` `authorizeManagement()` 自写 `audience !== "staff" || !permissions.includes("localization:manage")` 判断，且手工组 `ForbiddenException({ code, message, field_errors })` 错误体——`field_errors` 手造体与 `WemoHttpException`（runtime/validation.ts:6-20）及 ApiErrorFilter 体系重复。应改为注入 `AuthorizationService.requireStaffPermission("localization:manage")`（或 requireAudience("staff") + requirePermission），删掉 18 行自造逻辑。当前无 HTTP 调用方（属待接入的管理接口），是潜伏旁路。
- 可简化：`apps/api/src/modules/media/media.service.ts:26-46` 模块级 `canAccessVisibility()` 按 visibility 分支比较 `actor.audience`——可见性分层属领域判断可保留，但 "dealer"/"internal" 两层可表达为 `authorization.requireAudience("dealer", "staff")` / `requireAudience("staff")`，少一层手工比较。（低）

其余 `actor.audience !== "staff"` 类判断（dealers/quotes/orders/payments/returns service 的所有权与渠道分支，如 orders.service.ts:48-53、quotes.service.ts:126-127）是资源所有权业务规则而非权限判定，不构成旁路，不建议动。

---

## 6. 手写时间戳 / 随机数 / 业务单号（3 套生成器 + 重复 helper）

- `nowIso()` 同一 1 行函数在 3 个文件重复定义：`apps/api/src/modules/auth/auth.service.ts:21-22`、`auth/auth.prisma-repository.ts:23-24`、`cart/cart.redis-repository.ts:35-36`（另有 :40 的 +days 变体）。
- "现在"时间戳内联 `new Date().toISOString()` 约 25 处（create/update 时点），代表：forms.prisma-repository.ts:38/93、jobs.redis-repository.ts:42/74/132、notifications.redis-repository.ts:71/81/151、identity.prisma-repository.ts:106/150/279、dealers.prisma-repository.ts:410/494、inventory.prisma-repository.ts:133/179、orders.prisma-repository.ts:178、reports.redis-repository.ts:71、analytics.redis-repository.ts:57、integrations.redis-repository.ts:94、media.service.ts:103 等。（另有约 30 处 Prisma `Date → toISOString` 映射属于必要类型转换，不在此列。）
- 业务单号 3 套互相独立的手写生成器：
  - `apps/api/src/modules/quotes/quotes.prisma-repository.ts:44-48` `QUO-${Date.now()}${suffix}` 与 `:51-55` `ORD-${Date.now()}${suffix}`——同一文件内两份仅前缀不同的拷贝；
  - `apps/api/src/modules/forms/forms.prisma-repository.ts:177-179` `FS-${Date.now().toString(36)}-${Math.random()...}`——进制、随机源、分隔风格与上者全不一致。
  - 随机源均用 `Math.random`（非加密、可碰撞），randomUUID（node:crypto）已在 jobs/identity/reports 等正确复用为幂等键。
- `String(id)` 冗余强转 145 次集中在 repository（其中 redis hget/hset 的 key/field 位 ioredis 自动字符串化，属无害冗余，见第 8 类）。

建议：新增 `runtime/time.ts`（单一 `nowIso()`）与 `runtime/ids.ts`（`generateBusinessNo(prefix: string): string`，基于时间戳 + randomUUID 派生段或递增序号 + 随机段，三处统一调用），删除 3 份 nowIso 定义与 3 套单号生成器。

---

## 7. NestJS 能力未复用（无显著项）

逐项核对均达标：
- 应用装配走 `NestFactory.create` + `FastifyAdapter({ requestIdHeader })`（main.ts），CORS/prefix 单点于 `http/configure-application.ts:4-8`，无手写 body 解析（media/集成接口均无裸 @Req body 处理，webhook 签名头用 @Headers）。
- 无手工 `new Service()`；全局异常走 APP_FILTER（runtime.module.ts:13）、请求上下文走 APP_INTERCEPTOR（http/api-http.module.ts:7）。
- Redis/Prisma 客户端仅在全局模块注册一次（database.module.ts:18、redis.module.ts:39），各模块无重复 useFactory。
- 权限集中在 AuthorizationService 而非每方法自写（见第 5 类）。

可选低项：权限以 service 方法内一行调用为主而非 Nest Guard（@UseGuards + APP_GUARD）——当前"service 内集中判定"全库一致且已收编 AuthorizationService，属有意取舍，不建议改架构。

---

## 8. ioredis 能力未复用

- **KEYS + 正则解析 ID（1 处，症状最重）**：`apps/api/src/modules/cart/cart.redis-repository.ts:113-121` 用 `redis.keys("wemo:cart:*:items")` 全量扫 key，再对每个 key 跑 `/^wemo:cart:(\d+):items$/` 正则抠 ID。KEYS 在 Redis 是阻塞命令，正则 ID 解析把"索引"职责手工实现了一遍。
- **N+1 + 串行双 hgetall**：`cart.redis-repository.ts:122-124` 对每个 cartId 一次 `loadCart()`，而 `loadCart`（:298-306）内先 hgetall header 再 hgetall items 两次顺序往返——listCarts 一趟请求产生 2N+1 次往返，全部未用 pipeline/multi。同时 `:117` 正则匹配处 `.filter(...).map(Number)` 可用 ioredis 的 `scan` + pipeline 或更简单：把 cart id 维护进一个 Redis set（SADD/SMEMBERS），消除 KEYS 与 N+1。
- **冗余 String() 强转**：repository 内 `String(id)` 145 次，其中 redis 调用位（如 jobs.redis-repository.ts:31/64/93、integrations.redis-repository.ts:48/96、notifications.redis-repository.ts:110 等约 20+ 处）ioredis 自动接受 number，可省略（若第 1 类 helper 收编写操作则一并消失）。
- JSON.stringify/parse 散落见第 1 类；无其他 keys()/scan()/lua 手写。

建议：
1. cart 列表改索引集合或 SCAN（非阻塞）+ pipeline 一次取齐；
2. loadCart 双 hgetall 用 `redis.multi()`/`pipeline` 合并往返；
3. redis 调用位删 String() 或由第 1 类 helper 收编。

---

## 优先级建议

| 优先级 | 问题 | 位置（代表） | 建议 |
|---|---|---|---|
| 高 | ioredis：KEYS 阻塞扫描 + 正则抠 ID + listCarts N+1 双 hgetall | cart/cart.redis-repository.ts:113-144、298-306 | id 集合索引或 SCAN+pipeline；loadCart 合一趟往返 |
| 高 | zod 直析绕过 parseInput，错误变 500、丢 field_errors | localization/localization.service.ts:45/51/66/106/118/128/129 | 全改 parseInput |
| 高 | 自写权限 + 手造错误体绕过 AuthorizationService/WemoHttpException | localization/localization.service.ts:124-142 | 注入 AuthorizationService.requireStaffPermission |
| 中 | 手写 JSON 序列化循环（16 读循环 + 约 25 写 + 约 10 单值读） | 9 个 repository（identity 4 处最集中） | runtime/redis-hash.ts 类型化 helper，decode 复用 contracts zod schema |
| 中 | 手写 filter + slice 内存分页（11 方法/12 处 slice，整表读入） | cart/identity/inventory/jobs/notifications/integrations/forms/reports 等 | runtime/pagination.ts 统一；根治为迁 PostgreSQL 走 Prisma |
| 中 | 3 套业务单号生成器 + nowIso 3 份重复定义 + 约 25 处内联 now | quotes.prisma-repository.ts:44-55、forms.prisma-repository.ts:177-179、auth/cart nowIso | runtime/time.ts + runtime/ids.ts 单点，弃 Math.random |
| 低 | repo 手拼分页信封 + catalog.service.ts:182 复刻 listResponse 默认值 | catalog.service.ts:181-182 及 12 处 repo return | listResponse 单点信封；repo 只返回 items+total |
| 低 | media 可见性分支可用 requireAudience 组合 | media/media.service.ts:26-46 | 可选简化 |
| 低 | String(id) 冗余强转（redis 位约 20+ 处，总量 145） | 各 repository redis 调用 | 随第 1 类 helper 一并消失 |

注：NestJS 能力复用（第 7 类）经核对无显著问题；契约响应包装（第 4 类）无系统性绕过；全库 service 层权限与参数校验整体已统一，异常集中在这份表的 4 个"高/中"文件中。
