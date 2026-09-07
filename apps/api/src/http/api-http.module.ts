import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AuthModule } from "../modules/auth/auth.module";
import { RequestIdInterceptor } from "./request-id.interceptor";

@Module({
  imports: [AuthModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor }],
})
export class ApiHttpModule {}
