import { NestFactory } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { LocalizationService } from "../src/modules/localization/localization.service";

// PrismaClient 初始化时读取 DATABASE_URL；本地 docker postgres 已就绪。
process.env.DATABASE_URL ??=
  "postgresql://wemove:wemove@localhost:5432/wemove";

describe("AppModule 生产装配", () => {
  it("装配真实 LocalizationService 与 Prisma repository", async () => {
    const application = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    expect(application.get(LocalizationService)).toBeInstanceOf(
      LocalizationService,
    );
    await application.close();
  });
});
