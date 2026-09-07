import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { RequestContextStore } from "../runtime/request-context.store";
import { createRequestContext } from "../runtime/request-context.store";

/** 建立请求上下文并透传 x-request-id 响应头 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<{
      header(name: string, value: string): void;
    }>();

    const requestContext = createRequestContext(request);
    reply.header("x-request-id", requestContext.request_id);
    this.requestContext.enterWith(requestContext);

    return next.handle();
  }
}
