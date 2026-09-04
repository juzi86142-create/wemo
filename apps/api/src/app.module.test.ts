import { NestFactory } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { AppModule } from "./app.module";
import { LocalizationService } from "./modules/localization/localization.service";

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
