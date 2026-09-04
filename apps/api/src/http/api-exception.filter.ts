import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiErrorSchema, type ApiError } from "@wemo/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

type HttpErrorBody = {
  code?: unknown;
  message?: unknown;
  field_errors?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const requestId = request.id;
    const { error, status } = this.toApiError(exception, requestId);

    reply.header("x-request-id", requestId).status(status).send(error);
  }

  private toApiError(
    exception: unknown,
    requestId: string,
  ): { error: ApiError; status: number } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: ApiErrorSchema.parse({
          code: "VALIDATION_ERROR",
          message: "请求参数无效",
          field_errors: exception.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            message: issue.message,
          })),
          request_id: requestId,
        }),
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const body: HttpErrorBody =
        typeof response === "object" && response !== null ? response : {};
      return {
        status: exception.getStatus(),
        error: ApiErrorSchema.parse({
          code: typeof body.code === "string" ? body.code : "HTTP_ERROR",
          message:
            typeof body.message === "string" ? body.message : exception.message,
          field_errors: Array.isArray(body.field_errors)
            ? body.field_errors
            : [],
          request_id: requestId,
        }),
      };
    }

    this.logger.error(
      JSON.stringify({ event: "unhandled_exception", request_id: requestId }),
      exception instanceof Error ? exception.stack : undefined,
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: ApiErrorSchema.parse({
        code: "INTERNAL_ERROR",
        message: "服务器内部错误",
        field_errors: [],
        request_id: requestId,
      }),
    };
  }
}
