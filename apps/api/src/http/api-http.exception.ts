import { HttpException } from "@nestjs/common";

export class ApiHttpException extends HttpException {
  constructor(code: string, message: string, status: number) {
    super({ code, message, field_errors: [] }, status);
  }
}
