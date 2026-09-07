import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

import { ApiErrorFilter } from "./api-error.filter";
import { AuthorizationService } from "./authorization.service";
import { RequestContextStore } from "./request-context.store";

@Global()
@Module({
  providers: [
    RequestContextStore,
    AuthorizationService,
    { provide: APP_FILTER, useClass: ApiErrorFilter },
  ],
  exports: [RequestContextStore, AuthorizationService],
})
export class RuntimeModule {}
