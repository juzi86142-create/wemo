import "reflect-metadata";

import type { Http2ServerRequest } from "node:http2";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { configureApplication } from "./http/configure-application";
import { loadEnvFile } from "./runtime/env";

export interface CreateApiAppOptions {
  logger?: boolean;
}

/** 创建并配置 NestJS 应用 异常过滤与请求上下文由全局模块通过 APP_FILTER 与 APP_INTERCEPTOR 装配 */
export async function createApiApp(
  options: CreateApiAppOptions = {},
): Promise<NestFastifyApplication> {
  loadEnvFile();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: options.logger ?? true,
      requestIdHeader: "x-request-id",
      genReqId: (request: IncomingMessage | Http2ServerRequest) => {
        const header = request.headers["x-request-id"];
        if (typeof header === "string" && header.trim()) {
          return header.trim();
        }
        return randomUUID();
      },
    }),
  );

  configureApplication(app);

  return app;
}
