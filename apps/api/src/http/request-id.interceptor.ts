import { randomUUID } from "node:crypto";

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

type RequestWithId = FastifyRequest & { request_id?: string };

export function getOrCreateRequestId(request: FastifyRequest) {
  const target = request as RequestWithId;
  if (target.request_id) return target.request_id;

  const supplied = request.headers["x-request-id"];
  const normalized = typeof supplied === "string" ? supplied.trim() : "";
  target.request_id =
    normalized && normalized.length <= 128 ? normalized : randomUUID();
  return target.request_id;
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<{
      header(name: string, value: string): void;
    }>();
    const requestId = getOrCreateRequestId(request);
    reply.header("x-request-id", requestId);
    return next.handle();
  }
}
