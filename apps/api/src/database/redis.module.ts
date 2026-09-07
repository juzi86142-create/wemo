import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Redis } from "ioredis";

import { REDIS_CLIENT } from "./redis.constants";

/** 依据 REDIS_URL 环境变量创建 Redis 客户端连接 */
function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6380";
  const parsed = new URL(url);
  return new Redis({
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 6380),
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
  });
}

/** 应用关闭时断开 Redis 连接 */
class RedisLifecycle implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onApplicationShutdown() {
    await this.client.quit();
  }
}

/** 全局 Redis 模块 向所有模块提供 REDIS_CLIENT 令牌 */
@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, useFactory: createRedisClient },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
