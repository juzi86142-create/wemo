# API 源码说明

## 结构

- `main.ts`：进程启动、CORS、全局前缀、日志和全局中间件装配。
- `app.module.ts`：一次性装配所有领域模块；模块永远随单体共同部署。
- `health/`：存活/就绪检查。
- `modules/`：领域模块，每个子目录的 `README.md` 是该模块任务清单。

## 模块内部约定

复杂模块按需建立 `controllers/`、`application/`、`domain/`、`infrastructure/`。简单模块可以从一个 controller/service/repository 开始，不为形式创建空层。对外公开的 service/port 从模块入口导出，内部文件不被跨模块深层导入。

## 横向能力

认证上下文、request_id、统一错误、限流和审计通过 NestJS guard/interceptor/filter 组合；禁止在每个 controller 重复实现。数据库事务与一致性检查由 application service 主导，不能依靠物理外键兜底。
