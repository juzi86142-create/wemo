import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { RequestIdInterceptor } from "./request-id.interceptor";

@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor }],
})
export class ApiHttpModule {}
