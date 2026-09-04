import type { NestFastifyApplication } from "@nestjs/platform-fastify";

export function configureApplication(app: NestFastifyApplication) {
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    credentials: true,
    origin: [process.env.STOREFRONT_URL ?? "http://localhost:3000"],
  });
}
