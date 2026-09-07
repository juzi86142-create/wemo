import { Global, Module } from "@nestjs/common";

import { ApiErrorFilter } from "./api-error.filter";
import { AuthorizationService } from "./authorization.service";
import { PlatformRepository } from "./platform-state.store";
import { RequestContextStore } from "./request-context.store";

@Global()
@Module({
  providers: [
    RequestContextStore,
    AuthorizationService,
    PlatformRepository,
    ApiErrorFilter,
  ],
  exports: [
    RequestContextStore,
    AuthorizationService,
    PlatformRepository,
    ApiErrorFilter,
  ],
})
export class RuntimeModule {}

