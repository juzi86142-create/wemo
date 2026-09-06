# 测试策略（Demo 级别）

## 测试原则

- ✅ **只覆盖正常流程** - 测试Happy Path即可
- ✅ **Demo级别** - 不需要复杂的错误场景
- ✅ **本地运行** - 假设本地环境有PostgreSQL和MinIO

## 测试分类

### 1. 单元测试（Unit Tests）
- 位置：`tests/unit/`
- 目的：验证单个Service/Repository方法
- 范围：只测正常流程
- 示例：`localization.service.test.ts`

### 2. 数据库集成测试（Database Integration）
- 位置：`tests/unit/*/database.test.ts`
- 目的：验证Prisma Repository能正常读写数据库
- 控制：通过环境变量 `RUN_DATABASE_INTEGRATION=1` 启用
- 示例：`localization.database.test.ts`

### 3. HTTP集成测试（HTTP Integration）
- 位置：`tests/unit/*/http.test.ts`
- 目的：验证Controller端点能正常处理请求
- 控制：通过环境变量 `RUN_HTTP_INTEGRATION=1` 启用
- 示例：`localization.http.test.ts`

### 4. 生产装配测试（Production Assembly）
- 位置：`tests/app.module.test.ts`
- 目的：验证NestJS模块能正常装配
- 范围：验证所有Service和Repository能正确注入

### 5. 健康检查测试（Health Check）
- 位置：`tests/health.service.test.ts`
- 目的：验证基础健康检查端点

## 运行测试

```bash
# 运行所有单元测试（跳过数据库集成）
pnpm test

# 运行数据库集成测试
RUN_DATABASE_INTEGRATION=1 pnpm test

# 运行HTTP集成测试
RUN_HTTP_INTEGRATION=1 pnpm test

# 运行所有测试
RUN_DATABASE_INTEGRATION=1 RUN_HTTP_INTEGRATION=1 pnpm test
```

## 测试覆盖范围

| 模块 | 单元测试 | 数据库集成 | HTTP集成 |
|------|---------|-----------|---------|
| Localization | ✅ | ✅ | ✅ |
| Analytics | ⏳ | ⏳ | ⏳ |
| Audit | ⏳ | ⏳ | ⏳ |
| Auth | ⏳ | ⏳ | ⏳ |
| Cart | ⏳ | ⏳ | ⏳ |
| Catalog | ⏳ | ⏳ | ⏳ |
| Cms | ⏳ | ⏳ | ⏳ |
| Dealers | ⏳ | ⏳ | ⏳ |
| Forms | ⏳ | ⏳ | ⏳ |
| Identity | ⏳ | ⏳ | ⏳ |
| Integrations | ⏳ | ⏳ | ⏳ |
| Inventory | ⏳ | ⏳ | ⏳ |
| Jobs | ⏳ | ⏳ | ⏳ |
| Media | ⏳ | ⏳ | ⏳ |
| Notifications | ⏳ | ⏳ | ⏳ |
| Orders | ⏳ | ⏳ | ⏳ |
| Payments | ⏳ | ⏳ | ⏳ |
| Pricing | ⏳ | ⏳ | ⏳ |
| Quotes | ⏳ | ⏳ | ⏳ |
| Reports | ⏳ | ⏳ | ⏳ |
| Returns | ⏳ | ⏳ | ⏳ |
| Search | ⏳ | ⏳ | ⏳ |
| Seo | ⏳ | ⏳ | ⏳ |
| Settings | ⏳ | ⏳ | ⏳ |

## 测试数据管理

- 使用环境变量 `DATABASE_URL` 连接本地PostgreSQL
- 集成测试使用事务或清理脚本避免数据污染
- Seed数据通过 `apps/api/src/seed.ts` 提供
- Demo环境可以重复运行seed脚本

## 已知限制

- ❌ 暂不覆盖异常流程和错误处理
- ❌ 暂不覆盖并发场景
- ❌ 暂不覆盖权限拒绝场景
- ❌ 暂不覆盖状态机非法转换

## 下一步

当需要提升测试覆盖率时，可以按以下顺序补充：
1. 完成所有模块的单元测试（正常流程）
2. 补充数据库集成测试
3. 补充HTTP集成测试
4. 添加关键场景的状态机测试
