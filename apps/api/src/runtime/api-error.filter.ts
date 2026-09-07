import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type ExceptionFilter,
} from "@nestjs/common";
import { type ApiError, type FieldError } from "@wemo/contracts/common";
import type { FastifyReply } from "fastify";

import { RequestContextStore } from "./request-context.store";
import { WemoHttpException } from "./validation";

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "INTERNAL_SERVER_ERROR" : `HTTP_${status}`;
  }
}

function extractFieldErrors(response: unknown): FieldError[] {
  if (!response || typeof response !== "object") {
    return [];
  }

  const candidate = (response as { field_errors?: unknown }).field_errors;
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.flatMap((item) =>
    item && typeof item === "object" && "field" in item && "message" in item
      ? [
          {
            field: String((item as { field: unknown }).field),
            message: String((item as { message: unknown }).message),
          },
        ]
      : [],
  );
}

function extractMessage(response: unknown, fallback: string): string {
  if (typeof response === "string") {
    return response;
  }

  if (!response || typeof response !== "object") {
    return fallback;
  }

  const message = (response as { message?: unknown }).message;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return String(message[0]);
  }

  return fallback;
}

function normalizeApiError(
  exception: unknown,
  requestId: string,
): { status: number; body: ApiError } {
  if (exception instanceof WemoHttpException) {
    return {
      status: exception.status,
      body: {
        code: exception.code,
        message: exception.message,
        field_errors: exception.field_errors,
        request_id: requestId,
      },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const body: ApiError = {
      code: statusToCode(status),
      message: extractMessage(response, exception.message),
      field_errors: extractFieldErrors(response),
      request_id: requestId,
    };
    return { status, body };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "服务器发生错误",
      field_errors: [],
      request_id: requestId,
    },
  };
}

@Catch()
@Injectable()
export class ApiErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const requestId = this.requestContext.getRequestId();
    const { status, body } = normalizeApiError(exception, requestId);

    reply.header("x-request-id", requestId).status(status).send(body);
  }
}

export { normalizeApiError };
