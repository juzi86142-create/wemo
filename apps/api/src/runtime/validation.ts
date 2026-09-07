import { HttpException, HttpStatus } from "@nestjs/common";
import { type FieldError } from "@wemo/contracts/common";
import { type ZodIssue, type ZodTypeAny, z } from "zod";

/** 统一领域异常 携带领域 code 与字段错误 响应体符合 ApiError 结构 */
export class WemoHttpException extends HttpException {
  public readonly code: string;
  public readonly field_errors: FieldError[];

  constructor(
    code: string,
    message: string,
    field_errors: FieldError[] = [],
    status = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message, field_errors }, status);
    this.code = code;
    this.field_errors = field_errors;
  }
}

export function toFieldErrors(issues: ZodIssue[]): FieldError[] {
  return issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "request",
    message: issue.message,
  }));
}

export function parseInput<T extends ZodTypeAny>(
  schema: T,
  input: unknown,
  options?: {
    code?: string;
    message?: string;
    status?: number;
  },
): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  throw new WemoHttpException(
    options?.code ?? "VALIDATION_ERROR",
    options?.message ?? "请求参数无效",
    toFieldErrors(result.error.issues),
    options?.status ?? HttpStatus.BAD_REQUEST,
  );
}
