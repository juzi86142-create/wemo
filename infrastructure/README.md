# 本地中间件

此目录只负责本地开发所需的 PostgreSQL、Redis、MinIO 和 Mailpit。业务前端与 API 不放入 Docker，也不得从领域模块演变出独立服务。

```powershell
docker compose -f infrastructure/compose.middleware.yaml up -d
docker compose -f infrastructure/compose.middleware.yaml down
```

数据卷默认保留。连接信息与根目录 `.env.example` 一致，正式环境应使用各环境独立的安全凭据。
