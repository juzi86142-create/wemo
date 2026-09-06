# API 测试目录

本目录包含后端API的单元测试、集成测试和端到端测试。

## 目录结构

```
apps/api/tests/
├── unit/                    # 单元测试
│   ├── auth/               # 认证模块测试
│   ├── cart/               # 购物车模块测试
│   ├── catalog/            # 商品目录模块测试
│   ├── dealers/            # 经销商模块测试
│   ├── identity/           # 身份管理模块测试
│   ├── notifications/      # 通知模块测试
│   ├── orders/             # 订单模块测试
│   └── payments/           # 支付模块测试
├── integration/            # 集成测试（待补充）
└── e2e/                   # 端到端测试（待补充）
```

## 测试原则

**Demo项目测试原则**: 只测试合法情况（Happy Path），不测试非法/异常情况。

### 已覆盖的模块

- ✅ **auth**: 注册、登录、邮箱验证、密码找回、会话管理
- ✅ **cart**: 购物车CRUD、合并、清空
- ✅ **catalog**: 商品分类、商品、变体管理
- ✅ **dealers**: 经销商申请、审核、企业、成员管理
- ✅ **identity**: 用户资料、地址、订阅、角色管理
- ✅ **notifications**: 通知模板、发送记录、重试
- ✅ **orders**: 订单创建、查询、状态更新
- ✅ **payments**: 支付创建、捕获、退款

### 每个模块包含

- `*.service.test.ts` - Service层业务逻辑测试
- `*.controller.test.ts` - Controller层HTTP适配测试（如有）

## 运行测试

```bash
# 运行所有测试
cd apps/api
npm test

# 运行特定模块的测试
npm test -- tests/unit/auth

# 运行特定文件
npm test -- tests/unit/auth/auth.service.test.ts

# 查看详细输出
npm test -- --reporter=verbose

# 监听模式
npm test -- --watch
```

## 测试覆盖率

当前测试覆盖率：
- **单元测试**: 8个核心业务模块
- **集成测试**: 3个（runtime目录下）
- **E2E测试**: 待补充

## 待补充的测试

- ⏳ 其他业务模块（pricing, inventory, media等）
- ⏳ 集成测试（完整业务流程）
- ⏳ E2E测试（用户端到端流程）
- ⏳ 性能测试
- ⏳ 安全测试

## 测试命名规范

- 测试文件: `*.test.ts`
- 测试套件: `describe("模块名", () => { ... })`
- 测试用例: `it("场景描述", async () => { ... })`

## 示例

```typescript
describe("AuthService", () => {
  it("正常注册普通用户并返回用户信息", async () => {
    // 测试代码
  });
});
```
