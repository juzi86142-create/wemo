import { Global, Module } from "@nestjs/common";

import { ApiErrorFilter } from "./api-error.filter";
import { AuthorizationService } from "./authorization.service";
import { RequestContextStore } from "./request-context.store";

@Global()
@Module({
  providers: [
    RequestContextStore,
    AuthorizationService,
    ApiErrorFilter,
  ],
  exports: [
    RequestContextStore,
    AuthorizationService,
    ApiErrorFilter,
  ],
})
export class RuntimeModule {}
