import { HttpStatus } from "@nestjs/common";
import { type FieldError } from "@wemo/contracts/common";
import { type ZodIssue, type ZodTypeAny, z } from "zod";

export class WemoHttpException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field_errors: FieldError[] = [],
    public readonly status = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = "WemoHttpException";
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
    options?.message ?? "请求参数有误",
    toFieldErrors(result.error.issues),
    options?.status ?? HttpStatus.BAD_REQUEST,
  );
}
