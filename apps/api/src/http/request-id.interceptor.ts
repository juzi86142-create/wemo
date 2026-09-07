import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { SessionActorResolver } from "../modules/auth/session-actor-resolver";
import {
  createRequestContext,
  parseBearerToken,
  RequestContextStore,
} from "../runtime/request-context.store";

/** 建立请求上下文 解析 Bearer 令牌还原服务端会话 并透传 x-request-id 响应头 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
    @Inject(SessionActorResolver)
    private readonly sessionActorResolver: SessionActorResolver,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<{
      header(name: string, value: string): void;
    }>();

    // 同步绑定初始上下文 保证异常过滤器等外部执行链可见 request_id
    const initialContext = createRequestContext(request, null, null);
    reply.header("x-request-id", initialContext.request_id);
    this.requestContext.enterWith(initialContext);

    const token = parseBearerToken(request);
    const actor = token
      ? await this.sessionActorResolver.resolve(token)
      : null;

    this.requestContext.enterWith(
      createRequestContext(request, actor, token),
    );
    return next.handle();
  }
}
