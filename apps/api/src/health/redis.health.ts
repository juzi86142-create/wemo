import { Inject, Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import type { Redis } from "ioredis";

import { REDIS_CLIENT } from "../database/redis.constants";

/** Redis 健康指标 通过 PING 探活全局 Redis 连接 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      if (pong !== "PONG") {
        return this.getStatus(key, false, { message: "unexpected ping reply" });
      }
      return this.getStatus(key, true);
    } catch (error) {
      return this.getStatus(key, false, {
        message: error instanceof Error ? error.message : "ping failed",
      });
    }
  }
}
