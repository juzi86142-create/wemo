# 测试策略（Demo 级别）

## 测试原则

- ✅ **只覆盖正常流程** - 测试Happy Path即可
- ✅ **Demo级别** - 不需要复杂的错误场景
- ✅ **本地运行** - 假设本地环境有PostgreSQL、MinIO和Redis（默认 `redis://localhost:6380`）

## 测试分类

### 1. 单元测试（Unit Tests）
- 位置：`tests/unit/<module>/`
- 目的：验证单个Service/Repository方法
- 范围：只测正常流程
- 示例：`tests/unit/localization/localization.service.test.ts`

### 2. 数据库集成测试（Database Integration）
- 位置：`tests/unit/<module>/*.database.test.ts`
- 目的：验证Prisma Repository能正常读写数据库
- 控制：通过环境变量 `RUN_DATABASE_INTEGRATION=1` 启用（当前仅 `localization.database.test.ts` 使用该门禁）
- 示例：`tests/unit/localization/localization.database.test.ts`

### 3. HTTP集成测试（HTTP Integration）
- 位置：`tests/unit/<module>/*.http.test.ts`
- 目的：验证Controller端点能正常处理请求（真实 /api/v1 路由、统一错误结构）
- 控制：随套件默认运行（无 `RUN_HTTP_INTEGRATION` 门禁）
- 示例：`tests/unit/localization/localization.http.test.ts`

### 4. 生产装配测试（Production Assembly）
- 位置：`tests/app.module.test.ts`
- 目的：验证NestJS AppModule 24 个模块能正常装配、所有Service和Repository能正确注入

### 5. 契约解析测试（Contracts）
- 位置：`tests/unit/contracts/*.test.ts`（commerce/common/content/dealers/identity/platform 共 6 个文件、17 个用例）
- 目的：验证 `@wemo/contracts` 各域 schema 解析成功/失败路径

### 6. API 集成测试（API Integration）
- 位置：`tests/integration/api.integration.test.ts`
- 目的：真实数据库上的健康检查、localization（languages/markets）与 catalog 产品列表 happy path

### 7. 健康检查测试（Health Check）
- 位置：`tests/health.service.test.ts`
- 目的：验证基础健康检查端点

## 运行测试

需要本地 PostgreSQL（`DATABASE_URL`，未设置时测试回退到 `postgresql://wemove:wemove@localhost:5432/wemove`）。

```bash
# 默认运行：单元 + 契约 + HTTP + 装配 + API 集成（连本地数据库）
pnpm test

# 追加数据库集成套件（localization.database.test.ts）
RUN_DATABASE_INTEGRATION=1 pnpm test
```

注：历史文档提到的 `RUN_HTTP_INTEGRATION` 门禁已不存在，HTTP 集成测试随套件默认执行。

## 测试覆盖范围（现状 2026-09-07）

### 已覆盖套件

| 套件 | 单元测试 | 数据库集成 | HTTP集成 |
|------|---------|-----------|---------|
| Localization（service/repository） | ✅ | ✅ | ✅ |
| Contracts（6 文件 17 用例） | ✅ | - | - |
| AppModule 生产装配 | ✅ | - | - |
| Health | ✅ | - | - |
| API Integration（health/localization/catalog happy path，真实数据库） | - | ✅ | ✅ |

### 模块覆盖

| 模块 | 单元测试 | 数据库集成 | HTTP集成 |
|------|---------|-----------|---------|
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

覆盖说明：⏳ 模块已通过 typecheck 并有可运行 API，但测试未补齐；analytics/cart/notifications/integrations/jobs/reports 六个 Redis 持久化模块（连同 identity/dealers/inventory/orders 的 Redis 部分，见 `src/modules/README.md`）待补 Redis 读写测试，断言按真实持久化语义写（需本地 Redis，默认连接 `redis://localhost:6380`，可用 `REDIS_URL` 覆盖）。

## 测试数据管理

- 使用环境变量 `DATABASE_URL` 连接本地PostgreSQL
- 集成测试使用事务或清理脚本避免数据污染
- Seed数据通过 `apps/api/tests/seed.ts` 提供（`pnpm --filter @wemo/api seed`）
- Seed 是非破坏性的：按自然键判断存在性，已存在一律跳过，永不删除数据库已有数据
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
