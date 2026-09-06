# API 源码说明

## 结构

- `main.ts`：进程启动、CORS、全局前缀、日志和全局中间件装配。
- `app.module.ts`：一次性装配所有领域模块；模块永远随单体共同部署。
- `health/`：存活/就绪检查。
- `modules/`：领域模块，每个子目录的 `README.md` 是该模块任务清单。

## 模块内部约定

复杂模块按需建立 `controllers/`、`application/`、`domain/`、`infrastructure/`。简单模块可以从一个 controller/service/repository 开始，不为形式创建空层。对外公开的 service/port 从模块入口导出，内部文件不被跨模块深层导入。

## 演示模式 stub 模块

`modules/` 下共 24 个领域模块。其中 `analytics`、`cart`、`notifications`、`integrations`、`jobs`、`reports` 的对应表已从 `packages/database/prisma/schema.prisma` 移除，实现为 stub：读返回空值/空分页，写抛「Demo模式：暂不支持…」或以合成对象 + 日志占位（`cart.previewPricing` 按 `prices` 表真实计价）。`identity`/`dealers`/`inventory`/`orders` 中地址本、订阅、库存预占等被删表接口同样为 stub。改动 stub 语义前先核对 schema.prisma 表清单。

## 横向能力

认证上下文、request_id、统一错误、限流和审计通过 NestJS guard/interceptor/filter 组合；禁止在每个 controller 重复实现。数据库事务与一致性检查由 application service 主导，不能依靠物理外键兜底。
