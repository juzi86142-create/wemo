import "reflect-metadata";

import { randomUUID } from "node:crypto";
import type { Http2ServerRequest } from "node:http2";
import type { IncomingMessage } from "node:http";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { ApiErrorFilter, normalizeApiError } from "./runtime/api-error.filter";
import {
  createRequestContext,
  RequestContextStore,
} from "./runtime/request-context.store";

export interface CreateApiAppOptions {
  logger?: boolean;
}

export async function createApiApp(
  options: CreateApiAppOptions = {},
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: options.logger ?? true,
      genReqId: (request: IncomingMessage | Http2ServerRequest) => {
        const header = request.headers["x-request-id"];
        if (typeof header === "string" && header.trim()) {
          return header.trim();
        }
        return randomUUID();
      },
    }),
  );

  const requestContextStore = app.get(RequestContextStore);
  const fastify = app.getHttpAdapter().getInstance();

  // 请求上下文在 RequestIdInterceptor（与 controller 同一条 async 链）中 enterWith；
  // onRequest hook 仅兜底处理 context 创建失败等入口错误。
  fastify.addHook("onRequest", (request, reply, done) => {
    try {
      reply.header("x-request-id", String(request.id));
      done();
    } catch (error) {
      const requestId =
        typeof request.id === "string" && request.id.trim()
          ? request.id
          : randomUUID();
      const { status, body } = normalizeApiError(error, requestId);
      reply.header("x-request-id", requestId).status(status).send(body);
    }
  });

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    credentials: true,
    origin: [process.env.STOREFRONT_URL ?? "http://localhost:3000"],
  });
  app.useGlobalFilters(new ApiErrorFilter(requestContextStore));

  return app;
}
