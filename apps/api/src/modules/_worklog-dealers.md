# Dealers 模块修复记录

## 结果
`npx tsc --noEmit 2>&1 | grep "src/modules/dealers"` → 空（0 错误）。

## 改动文件（仅限 dealers 模块自身）
- `apps/api/src/modules/dealers/dealers.repository.ts`（接口）
- `apps/api/src/modules/dealers/dealers.prisma-repository.ts`（实现）
- `apps/api/src/modules/dealers/dealers.service.ts`（服务）
- dealers.module.ts 未改（装配已正确：DatabaseModule 提供/导出 DATABASE_CLIENT，RuntimeModule 为 @Global，DEALERS_REPOSITORY token → DealersPrismaRepository）。

## 关键决策
1. **契约形状完整映射**：`DealerApplication`/`DealerCompany`/`DealerMember` 按 @wemo/contracts 补全全部字段；DB 行没有的字段从 payload/terms Json 取并给默认值：
   - 申请：display_name/website/business_type/tax_id/contact_name/contact_phone/currency ← payload（createApplication 时把表单字段规范化写入 payload 保证可回读），company_id 恒 null。
   - 公司：website/business_type/tax_id/payment_terms/sales_territories/authorized_categories/sales_rep ← terms；payment_terms 默认 "net30"、销售区域/授权分类默认 []、sales_rep/website/tax_id 默认 null、business_type 默认 "general"。
   - 成员：invited_at 恒 null、joined_at 默认 now（表无这两列）；permissions 非数组时 []。
   - 枚举字段（status 等）DB 为 String，映射时 `as` 契约联合类型。
2. **review 用 $transaction**：先查申请不存在抛 NotFoundException；update 状态 + reviewedAt + reviewNote(input.reason)；approved 时 create dealer_company（legalName/displayName/country 来自申请，tier_id/price_list_id/public_listing 来自 review 输入，terms = 申请 payload 展开 + payment_terms 等 review 输入），applicantUserId 存在时再 create dealer_member（admin/dealer:read/write）；返回 application/company/member（member 可为 null）。
3. **listDealerMembers 无 include**：findMany dealerMember → 单独 findMany users（id in）→ Map 拼 user {id,email,name}（契约 passthrough，user 为附加键）。
4. **地址 stub**：listDealerAddresses → []；createDealerAddress(companyId, input) → throw new Error("Demo模式：暂不支持经销商地址管理")（表已删除，签名按 service 调用改为两参）。
5. **service 全面 async/await**：原代码把 Promise 直接塞进 zod parse，运行期必挂；现按 localization 风格 await 后 parse；get/submit/company 等对 null 抛 NotFoundException。构造函数类型从 DealersPrismaRepository 改为 DealersRepository 接口。
6. **exactOptionalPropertyTypes 处理**：repo 查询参数可选字段显式 `| undefined`；update 的 prisma data 与 where 一律条件展开（`x !== undefined ? {k:v} : {}`），杜绝 `x ?? undefined` 和显式 undefined 赋值；create 数据里的 null 用 `?? null` 收口。
7. **数据写入约定**：application payload 与 company terms 均用 snake_case 键（与 seed.ts terms: { payment_terms: "net30" } 及 review/update 输入键一致）。
8. 禁止修改项（schema.prisma、packages/contracts、app.module.ts、controller）未触碰；dealer controller 无报错。
