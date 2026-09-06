import { Global, Module } from "@nestjs/common";

import { ApiErrorFilter } from "./api-error.filter";
import { AuthorizationService } from "./authorization.service";
import { PlatformStateStore } from "./platform-state.store";
import { RequestContextStore } from "./request-context.store";

@Global()
@Module({
  providers: [
    RequestContextStore,
    AuthorizationService,
    PlatformStateStore,
    ApiErrorFilter,
  ],
  exports: [
    RequestContextStore,
    AuthorizationService,
    PlatformStateStore,
    ApiErrorFilter,
  ],
})
export class RuntimeModule {}
