# API 领域模块总览

`apps/api/src/modules` 是 Node.js/NestJS 模块化单体的领域模块目录。所有模块在同一个 API 进程内运行，不拆分微服务。

- 每个子目录只负责一个业务领域，并维护自己的 `README.md`。
- Controller 负责 HTTP 适配，应用服务负责用例编排，领域规则负责状态机与边界，基础设施负责 Prisma/Redis/对象存储/外部服务适配。
- 模块之间通过公开应用服务或领域事件协作，不直接绕过服务层修改其他模块数据。
- 所有实体 ID 使用 PostgreSQL 自增整数；跨表只保存逻辑 ID，禁止物理外键。
