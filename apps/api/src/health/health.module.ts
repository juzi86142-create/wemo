import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { DatabaseModule } from "../database/database.module";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./redis.health";

@Module({
  imports: [TerminusModule, DatabaseModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
