# API 源码说明

## 结构

- `main.ts`：进程启动、CORS、全局前缀、日志和全局中间件装配。
- `app.module.ts`：一次性装配所有领域模块；模块永远随单体共同部署。
- `health/`：存活/就绪检查。
- `modules/`：领域模块，每个子目录的 `README.md` 是该模块任务清单。

## 模块内部约定

复杂模块按需建立 `controllers/`、`application/`、`domain/`、`infrastructure/`。简单模块可以从一个 controller/service/repository 开始，不为形式创建空层。对外公开的 service/port 从模块入口导出，内部文件不被跨模块深层导入。

## Redis 持久化模块

`modules/` 下共 24 个领域模块。`analytics`、`cart`、`notifications`、`integrations`、`jobs`、`reports` 六个模块的数据持久化在 Redis：分析事件/购物车/通知模板与投递/集成配置/作业执行记录/报表定义与结果均真实读写（全局 RedisModule，ioredis，`REDIS_CLIENT` 令牌，键前缀 `wemo:`，见 `src/database/`）。`identity` 的地址本、订阅、数据请求与通知投递，`auth` 的订阅与通知投递，`dealers` 的企业地址，`inventory`/`orders` 的库存预占与幂等标记同样落在 Redis。规则：Redis 作为持久层的数据一律不设 TTL 到期清理，只有真正的缓存才允许过期删除；购物车 `expires_at` 是业务字段由应用层判断。PostgreSQL 保留 30 张核心表，承载表单提交与库存余额（预占在 PG 事务内扣减）。改动持久化语义前先核对 schema.prisma 表清单与 Redis 键（`REDIS_KEY_PREFIX`）。

## 横向能力

认证上下文、request_id、统一错误、限流和审计通过 NestJS guard/interceptor/filter 组合；禁止在每个 controller 重复实现。数据库事务与一致性检查由 application service 主导，不能依靠物理外键兜底。
