# API 模块测试套件

## 测试原则

- ✅ **只覆盖正常流程** - 测试Happy Path即可
- ✅ **Demo级别** - 不需要复杂的错误场景
- ✅ **统一位置** - 所有测试文件放在 `tests/` 目录下

## 测试结构

```
tests/
├── unit/                              # 单元测试（Mock依赖）
│   ├── catalog.service.test.ts       # ✅ 产品目录服务
│   ├── orders.service.test.ts        # ✅ 订单服务
│   ├── identity.service.test.ts      # ✅ 用户身份服务
│   ├── dealers.service.test.ts       # ✅ 经销商服务
│   ├── cart.service.test.ts          # ✅ 购物车服务
│   ├── localization.service.test.ts  # 本地化服务
│   └── ...
├── integration/                       # 集成测试（真实数据库）
│   ├── public-api.integration.test.ts     # ✅ 公开API（健康检查、分类、产品）
│   ├── api.integration.test.ts            # 管理API（settings, audit）
│   ├── experience-commerce.integration.test.ts
│   └── identity-dealers.integration.test.ts
├── app.module.test.ts                 # AppModule装配测试
├── health.service.test.ts             # 健康检查测试
└── README.md                          # 本文档
```

## 运行测试

### 1. 单元测试（无需数据库）

```bash
pnpm test
```

### 2. 完整测试套件

```bash
pnpm test
```

集成测试会自动运行（使用现有的数据库连接）。

## 测试覆盖范围

### 当前状态（2026-09-07）

```
Test Files:  9 passed | 3 skipped (12)
Tests:       23 passed | 12 skipped (35)
```

### 单元测试（Mock）

| 模块 | 测试覆盖 | 状态 |
|------|---------|------|
| Catalog Service | listCategories, listProducts | ✅ |
| Orders Service | listOrders, getOrder | ✅ |
| Identity Service | getProfile, listRoles | ✅ |
| Dealers Service | listPublicListings, getCompany | ✅ |
| Cart Service | getCurrent, listCarts | ✅ |

### 集成测试（真实数据库）

| 模块 | 测试覆盖 | 状态 |
|------|---------|------|
| Health | GET /api/v1/health | ✅ |
| Localization | GET /api/v1/localization/languages, markets | ✅ |
| Catalog | GET /api/v1/catalog/products, categories | ✅ |
| Auth | POST /api/v1/auth/register, login | ⏳ (路由调试中) |

## 测试数据管理

- **单元测试**：使用 Mock 数据，不依赖数据库
- **集成测试**：直接使用现有数据库（需确保本地 PostgreSQL 和 Redis 正在运行）

## 数据库配置

确保 `.env` 文件配置正确：

```bash
DATABASE_URL=postgresql://wemove:wemove@localhost:5432/wemove
REDIS_URL=redis://localhost:6379
```

启动基础设施：

```bash
docker-compose up -d postgres redis
```

## 已知限制

- ⚠️ Auth 集成测试需要调试（路由权限验证）
- ❌ 暂不覆盖异常流程和错误处理
- ❌ 暂不覆盖并发场景

## 下一步计划

1. ✅ 完成核心模块单元测试
2. ✅ 补充公开API集成测试
3. ⏳ 调试Auth集成测试
4. 添加Admin API权限测试
5. 补充E2E测试（完整用户流程）
