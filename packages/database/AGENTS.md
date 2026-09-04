# Database 包说明

## 入口与职责

- `src/client.ts` 创建 PostgreSQL/Prisma 客户端。
- `prisma/schema.prisma` 按业务领域声明表、索引和逻辑关系。\n- `prisma/domains/*/README.md` 记录各领域模型范围和后续实现任务。
- `prisma/migrations/` 只保存 Prisma 生成并经审查的 SQL；不得手写绕过 schema 规则。

## 禁止物理外键

- Prisma datasource 必须设置 `relationMode = "prisma"`，禁止使用 `relationMode = "foreignKeys"`。
- 不在模型中声明 Prisma 关系字段；跨表只保存整数逻辑 ID，由应用服务维护一致性。
- 任何 migration 禁止出现 `FOREIGN KEY` 或 SQL `REFERENCES`。
- 关联字段仍使用明确名称，例如 `company_id`、`product_id`、`order_id`，并为查询与一致性巡检建立索引。
- 所有实体主键和实体逻辑关联字段使用 PostgreSQL `INTEGER` 自增主键/整数 ID；禁止 UUID 主键。
- 逻辑关联的存在性、企业边界、状态和删除限制由单体 API application service 在事务内检查。
- 订单、付款、报价、审核、审计等记录不物理级联删除；采用归档、软删除或去标识。

## 领域数据

- `identity`：用户、会话、角色、权限、地址。
- `dealers`：申请、企业、成员、企业地址/门店。
- `catalog`：产品、变体、分类及逻辑关联。
- `pricing`：价格表、零售/B2B/专属/阶梯价格历史。
- `inventory`：库存余额和预占。
- `commerce`：购物车、订单、报价、支付、发货和售后。
- `content`：CMS、媒体、下载、表单和 SEO 内容。
- `platform`：市场、设置、审计、outbox、通知与分析。

## 迁移要求

生成迁移后先运行 `pnpm check:database`，再在空库和脱敏快照库演练。生产变更需提供回滚/前滚方案、数据回填任务和一致性核对 SQL。
