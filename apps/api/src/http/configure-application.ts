import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import multipart from "@fastify/multipart";

export async function configureApplication(app: NestFastifyApplication) {
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    credentials: true,
    origin: [process.env.STOREFRONT_URL ?? "http://localhost:3000"],
  });
  // 文件上传 需求 7.11 媒体库上传
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  });
}
