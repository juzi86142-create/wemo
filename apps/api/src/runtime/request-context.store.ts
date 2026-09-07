import { BadRequestException, Injectable } from "@nestjs/common";
import {
  RequestContextSchema,
  type RequestContext,
  type RequestActor,
} from "@wemo/contracts/platform";
import { SessionActorSchema } from "@wemo/contracts/identity";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { FastifyRequest } from "fastify";
import type { ZodIssue } from "zod";

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

function parseActorHeader(rawActor: string | undefined): RequestActor | null {
  if (!rawActor) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawActor) as unknown;
    const result = SessionActorSchema.safeParse(parsed);
    if (!result.success) {
      throw new WemoHttpException(
        "AUTH_CONTEXT_INVALID",
        "认证上下文格式无效",
        result.error.issues.map((issue: ZodIssue) => ({
          field: issue.path.length ? issue.path.join(".") : "actor",
          message: issue.message,
        })),
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof WemoHttpException) {
      throw error;
    }

    throw new BadRequestException("x-wemo-actor 必须是合法 JSON");
  }
}

export function createRequestContext(request: FastifyRequest): RequestContext {
  const requestId = request.id || randomUUID();
  const rawContext = {
    request_id: requestId,
    method: request.method,
    path: request.url,
    market:
      headerValue(request.headers, "x-wemo-market") ??
      process.env.WEMO_DEFAULT_MARKET ??
      "global",
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
    actor: parseActorHeader(headerValue(request.headers, "x-wemo-actor")),
  };

  return RequestContextSchema.parse(rawContext);
}

@Injectable()
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
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
}
