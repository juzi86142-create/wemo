# Worklog: auth + identity 模块 typecheck 修复

日期：2026-09-07
状态：`npx tsc --noEmit` 过滤 `src/modules/(auth|identity)` 输出为空（0 错误）。

## 修改文件

- `apps/api/src/modules/auth/auth.repository.ts`
- `apps/api/src/modules/auth/auth.prisma-repository.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/identity/identity.repository.ts`
- `apps/api/src/modules/identity/identity.prisma-repository.ts`
- `apps/api/src/modules/identity/identity.service.ts`

（auth.module.ts / identity.module.ts 装配本来就正确：Service + Symbol token useClass；AuthorizationService/RequestContextStore 由 @Global RuntimeModule 提供，无需改动。controller 未报错，未修改。）

## 关键决策

### 契约类型
- contracts 只导出 schema 推导类型，不导出 `AuthSessionListResponse` / `AuthSessionMutationResponse` / `IdentityUserMutationResponse` / `IdentityNotificationMutationResponse` / `IdentityUserListQuery`。统一改为从 `@wemo/contracts` 导入真实存在的 item 类型（`IdentityUser`、`AuthSession`、`IdentityNotification`、`IdentityRole`…），列表响应用本地 `AuthSessionListResult` / `IdentityUserListResult` / `IdentityNotificationListResult` 接口（与 `createListResponseSchema` 形状一致：items/page/page_size/total）。

### Auth（users/sessions 真实查询，deleted 表 stub）
- users/sessions 表行用无 select 的全行查询；私有 `mapUser(user: UserRow)` / `mapSession(session: SessionRow)` 以结构类型收口，末字段 DB string 用 `as IdentityUser["audience"]` 等 cast 收口契约枚举。
- `IdentityUser` 映射补全：phone、locale、status、`verified_at: verifiedAt ? iso : null`、created_at/updated_at；`verified`（非契约字段）删除。
- `AuthSession` 映射补全 11 个字段：audience 取自 session.audience；permissions 默认 `[]`；company_id 默认 `null`（sessions 表不存企业与权限快照）；`last_seen_at` 用 createdAt 的 ISO（表无 last_seen 列）。
- `authenticate` 抛错语义保留（找不到时 throw），返回完整 IdentityUser。
- `recordNotification` → 合成 IdentityNotification 契约对象 + console.log，无 DB（notification_deliveries 已删）；id 用 Date.now()（正整数，能过运行时 zod parse）。
- `upsertSubscription` → 空实现（subscriptions 已删）。
- listSessions 查询参数用 `AuthSessionListQuery & { user_id: number }`（契约 query 无 user_id，service 需按 actor 过滤自己）；status="expired" 分支补上 `revokedAt: null + expiresAt <= now`。
- auth.service 全部方法改 async 并补 await（原来多处把 Promise 当对象用，如 `item.id`/`user?.id`）；createUser 入参去掉非契约的 `verified`；register 里 upsertSubscription/recordNotification 顺序 await。

### Identity（stub 语义按清单执行）
- listAddresses → `[]`；upsertAddress / createAddress（service 调用而接口缺失，补充，同语义）→ throw "Demo模式：暂不支持地址本"；deleteAddress → 空实现。
- listSubscriptions → `[]`；upsertSubscription → throw。
- listDataRequests → `[]`；createDataRequest → throw（入参类型为 service 实际传的 `{kind, request_id, notes: string|null}`）。
- listNotifications → 空分页 `{items: [], total: 0, page: query.page, page_size: query.page_size}`（补齐 page/page_size 才能通过 ListResponseSchema 运行时校验；接口参数改为契约 `IdentityNotificationListQuery`，service 端用条件展开规避 exactOptionalPropertyTypes 下 status 显式 undefined 问题）。account 端查询强制 `recipient_user_id = actor.user_id`，admin 端走 requireStaffPermission("notifications:read")。
- `setUserPermissions(userId, permissions)`（service 调用而接口缺失，补充）：真实用户校验（NotFound 抛错）+ 有 user_roles 成员记录时把 permissions 持久化到 `overrides: { permissions }`（roles 表无权限列，user_roles.overrides 是唯一可落地点）；返回按 `IdentityRoleMutationResponseSchema` 契约形状收口的权限视图（id=userId, code="user_permissions", name=user.name, audience 来自 user.audience），保证 service 的 schema.parse 运行时可通过。
- updateProfile 用条件展开构造 Prisma data（exactOptionalPropertyTypes 下避免显式 undefined 写入）。
- `getDealerContextForUser` → 真实查询 dealerMember（status=active）+ 关联 dealerCompany，返回完整 `DealerContext`（company_id/display_name/status/currency/permissions，permissions 取 member.permissions Json，Array.isArray 防御）——因为 IdentityProfileSchema 里的 dealer_context 是 DealerContextSchema.nullable()，只给 `{company_id}` 会挂运行时校验；getProfile 已接入该方法。
- getProfile 补 await + 用户不存在抛 NotFoundException；listRoles/createRole/updateRole 等保持真实查询，audience cast 收口，permissions 返回 `[]`（roles 表无列）。

## 验证命令
```
cd apps/api && npx tsc --noEmit 2>&1 | grep -E "src/modules/(auth|identity)"
```
输出为空。（全仓 tsc 其余错误属于其他模块/seed，由对应任务处理。）
