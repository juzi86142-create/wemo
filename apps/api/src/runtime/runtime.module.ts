import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { ApiErrorFilter } from "./api-error.filter";
import { AuthorizationService } from "./authorization.service";
import { RequestContextStore } from "./request-context.store";

/** 全局默认限流 每 IP 每分钟 100 次 登录/表单/搜索等敏感路由按需收紧 */
const GLOBAL_THROTTLE_LIMIT = 100;
const GLOBAL_THROTTLE_TTL_MS = 60_000;

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: GLOBAL_THROTTLE_TTL_MS, limit: GLOBAL_THROTTLE_LIMIT },
      ],
    }),
  ],
  providers: [
    RequestContextStore,
    AuthorizationService,
    { provide: APP_FILTER, useClass: ApiErrorFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [RequestContextStore, AuthorizationService],
})
export class RuntimeModule {}
