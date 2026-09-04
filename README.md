# WEMOVE SPORTS 平台

本仓库是 `网站重构需求.md` 的 TypeScript 全栈 monorepo 基架。系统采用前后端分离：公开官网使用 React SSR，业务门户使用 React SPA，Node.js API 统一承载鉴权、商品、经销商、交易、CMS 与运营能力。

## 工作区

| 工作区 | 职责 | 默认端口 |
| --- | --- | --- |
| `apps/storefront` | 唯一 React 前端：官网、用户中心、经销商中心和管理后台 | 3000 |
| `apps/api` | 独立 Node.js/NestJS API | 4000 |
| `packages/contracts` | 跨端 API 契约、枚举和校验模型 | - |
| `packages/database` | PostgreSQL/Prisma 数据访问与逻辑关联模型 | - |
| `packages/ui` | 前端共享的设计令牌与组件 | - |

各一级工作区使用 `AGENTS.md` 说明边界、任务和约束；各领域子模块使用 `README.md` 说明需要实现的功能。

## 快速开始

```powershell
Copy-Item .env.example .env
pnpm install
docker compose -f infrastructure/compose.middleware.yaml up -d
pnpm dev
```

Docker 只启动 PostgreSQL、Redis、MinIO 与 Mailpit 等本地中间件。唯一 React 前端和单体 Node.js API 均由 pnpm 在宿主机运行，不构建应用容器。

内部共享包统一编译到各自的 `dist/` 后再由应用加载。`pnpm dev` 会先构建共享包，再并行启动共享包监听器、前端和 API，保证开发与生产使用相同的包入口。

## 验收入口

```powershell
pnpm check:requirements
pnpm typecheck
pnpm test
pnpm build
pnpm check:runtime
```

需求拆解见 `docs/task-breakdown.md`，逐项追踪见 `docs/requirements-traceability.md`。当前提交是可运行的工程基架，不代表需求功能已经实现；后续功能完成必须同步更新追踪矩阵中的状态和证据。全部可执行源码、配置代码与自动化脚本使用 TypeScript，不新增 JavaScript 源文件。

## 数据库硬约束

数据库禁止物理外键。所有跨表关系只保存整数逻辑 ID，并通过索引、事务、应用服务和一致性检查维护。Prisma schema 必须使用 `relationMode = "prisma"`，所有实体主键使用 `Int @default(autoincrement())`；任何 SQL migration 都不得包含 `FOREIGN KEY` 或 `REFERENCES`。
