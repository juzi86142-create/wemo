import { Controller, Get, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../database/database.constants";
import { RedisHealthIndicator } from "./redis.health";

/** 健康检查 复用 @nestjs/terminus 探活 PostgreSQL 与 Redis */
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prisma.pingCheck("database", this.database),
      () => this.redis.pingCheck("redis"),
    ]);
  }
}
