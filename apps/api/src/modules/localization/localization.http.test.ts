import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { Language, Market } from "@wemo/contracts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { configureApplication } from "../../http/configure-application";
import { ApiHttpModule } from "../../http/api-http.module";
import { LocalizationController } from "./localization.controller";
import {
  LOCALIZATION_REPOSITORY,
  type LocalizationRepository,
} from "./localization.repository";
import { LocalizationService } from "./localization.service";

const language: Language = {
  id: 1,
  code: "en",
  label: "English",
  native_label: "English",
  status: "active",
};
const market: Market = {
  id: 1,
  code: "US",
  currency: "USD",
  timezone: "America/New_York",
  fallback_policy: "default_locale",
  locales: [
    {
      locale: "en-US",
      language,
      path_prefix: "en-us",
      is_default: true,
      sort_order: 0,
    },
  ],
  status: "active",
};

const repository: LocalizationRepository = {
  listPublicLanguages: vi.fn(async () => ({ items: [language], total: 1 })),
  listPublicMarkets: vi.fn(async () => ({ items: [market], total: 1 })),
  findPublicMarket: vi.fn(async (code: string) =>
    code === market.code ? market : null,
  ),
  upsertLanguage: vi.fn(),
  saveMarket: vi.fn(),
};

@Module({
  imports: [ApiHttpModule],
  controllers: [LocalizationController],
  providers: [
    LocalizationService,
    { provide: LOCALIZATION_REPOSITORY, useValue: repository },
  ],
})
class LocalizationHttpTestModule {}

describe("Localization HTTP", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      LocalizationHttpTestModule,
      new FastifyAdapter({
        logger: false,
        requestIdHeader: "x-request-id",
      }),
      { logger: false },
    );
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("经真实 /api/v1 路由返回分页市场，并透传 request_id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/localization/markets?page=1&page_size=20",
      headers: { "x-request-id": "req-http-1" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("req-http-1");
    expect(response.json()).toMatchObject({
      items: [{ code: "US" }],
      page: 1,
      page_size: 20,
      total: 1,
    });
  });

  it("经真实 HTTP 调用解析默认语言回退", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/localization/market-context?market=US&locale=zh-CN",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      requested_locale: "zh-CN",
      resolved_locale: "en-US",
      used_fallback: true,
    });
  });

  it("将 Zod 校验失败转换为统一错误结构", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/localization/markets?page_size=101",
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "请求参数无效",
      field_errors: [{ field: "page_size" }],
    });
    expect(body.request_id).toBe(response.headers["x-request-id"]);
  });

  it("市场不存在时返回带 request_id 的领域错误", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/localization/market-context?market=CN&locale=zh-CN",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: "MARKET_NOT_FOUND",
      field_errors: [],
      request_id: response.headers["x-request-id"],
    });
  });
});
