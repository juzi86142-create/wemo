import type { NestFastifyApplication } from "@nestjs/platform-fastify";

import { ApiExceptionFilter } from "./api-exception.filter";
import { RequestIdInterceptor } from "./request-id.interceptor";

export function configureApplication(app: NestFastifyApplication) {
  app.setGlobalPrefix("api/v1");
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    credentials: true,
    origin: [process.env.STOREFRONT_URL ?? "http://localhost:3000"],
  });
}
