import { BadRequestException, Injectable } from "@nestjs/common";
import {
  RequestContextSchema,
  type RequestContext,
  type RequestActor,
} from "@wemo/contracts/platform";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { FastifyRequest } from "fastify";

import { WemoHttpException } from "./validation";

function headerValue(
  headers: FastifyRequest["headers"],
  name: string,
): string | undefined {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

/** 解析 Authorization Bearer 令牌 服务端会话解析不信任任何身份头 */
export function parseBearerToken(request: FastifyRequest): string | null {
  const authorization = headerValue(request.headers, "authorization");
  if (!authorization) {
    return null;
  }
  const [scheme, token, ...rest] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || token.length < 16 || rest.length > 0) {
    throw new WemoHttpException(
      "AUTH_HEADER_INVALID",
      "Authorization 头必须是 Bearer <token> 格式",
    );
  }
  return token;
}

export function createRequestContext(
  request: FastifyRequest,
  actor: RequestActor | null = null,
  sessionToken: string | null = null,
): RequestContext {
  const requestId = request.id || randomUUID();
  const rawContext = {
    request_id: requestId,
    method: request.method,
    path: request.url,
    market:
      headerValue(request.headers, "x-wemo-market") ??
      process.env.WEMO_DEFAULT_MARKET ??
      "US",
    locale:
      headerValue(request.headers, "x-wemo-locale") ??
      process.env.WEMO_DEFAULT_LOCALE ??
      "en-US",
    currency:
      headerValue(request.headers, "x-wemo-currency") ??
      process.env.WEMO_DEFAULT_CURRENCY ??
      "USD",
    ip: request.ip ?? null,
    user_agent: headerValue(request.headers, "user-agent") ?? null,
    session_token: sessionToken,
    actor,
  };

  return RequestContextSchema.parse(rawContext);
}

@Injectable()
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * 将 context 绑定到当前异步执行链（含 done() 之后的后续 handler）。
   * HTTP 请求入口必须用 enterWith 而非 run：run 的 callback 返回后
   * 后续 Fastify handler 会脱离 context。
   */
  enterWith(context: RequestContext): void {
    this.storage.enterWith(context);
  }

  getContext(): RequestContext | null {
    return this.storage.getStore() ?? null;
  }

  requireContext(): RequestContext {
    const context = this.getContext();
    if (!context) {
      throw new BadRequestException("当前请求缺少上下文");
    }
    return context;
  }

  getRequestId(): string {
    return this.getContext()?.request_id ?? "unknown-request";
  }

  getActor(): RequestActor | null {
    return this.getContext()?.actor ?? null;
  }

  getCompanyId(): number | null {
    return this.getActor()?.company_id ?? null;
  }

  getMarket(): string {
    return this.getContext()?.market ?? "global";
  }

  getLocale(): string {
    return this.getContext()?.locale ?? "en-US";
  }

  getCurrency(): string {
    return this.getContext()?.currency ?? "USD";
  }

  getIp(): string | null {
    return this.getContext()?.ip ?? null;
  }

  getSessionToken(): string | null {
    return this.getContext()?.session_token ?? null;
  }
}
