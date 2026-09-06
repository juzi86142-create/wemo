import type {
  Language,
  Market,
  Pagination,
  SaveMarketInput,
  UpsertLanguageInput,
} from "@wemo/contracts";
import { describe, expect, it, vi } from "vitest";

import type {
  LocalizationRepository,
  PageResult,
} from "./localization.repository";
import { LocalizationService } from "./localization.service";

const english: Language = {
  id: 1,
  code: "en",
  label: "English",
  native_label: "English",
  status: "active",
};

function market(fallback_policy: Market["fallback_policy"]): Market {
  return {
    id: 1,
    code: "US",
    currency: "USD",
    timezone: "America/New_York",
    fallback_policy,
    locales: [
      {
        locale: "en-US",
        language: english,
        path_prefix: "en-us",
        is_default: true,
        sort_order: 0,
      },
    ],
    status: "active",
  };
}

function repositoryFor(currentMarket: Market): LocalizationRepository {
  return {
    listPublicLanguages: vi.fn(async (): Promise<PageResult<Language>> => ({
      items: [english],
      total: 1,
    })),
    listPublicMarkets: vi.fn(async (): Promise<PageResult<Market>> => ({
      items: [currentMarket],
      total: 1,
    })),
    findPublicMarket: vi.fn(async (code: string) =>
      code === currentMarket.code ? currentMarket : null,
    ),
    upsertLanguage: vi.fn(async (input: UpsertLanguageInput) => ({
      id: 2,
      ...input,
    })),
    saveMarket: vi.fn(async (_input: SaveMarketInput) => currentMarket),
  };
}

const staffContext = {
  actor: {
    user_id: 9,
    audience: "staff" as const,
    permissions: ["localization:manage"],
  },
  request_id: "req-admin-1",
};

describe("LocalizationService", () => {
  it("通过公开应用服务返回统一分页结果", async () => {
    const service = new LocalizationService(
      repositoryFor(market("default_locale")),
    );
    const pagination: Pagination = { page: 1, page_size: 20 };

    await expect(service.listLanguages(pagination)).resolves.toEqual({
      items: [english],
      total: 1,
      ...pagination,
    });
    await expect(service.listMarkets(pagination)).resolves.toMatchObject({
      total: 1,
      ...pagination,
    });
  });

  it("按市场默认语言完整回退并返回对应路径", async () => {
    const service = new LocalizationService(
      repositoryFor(market("default_locale")),
    );

    await expect(
      service.resolveMarketContext({ market: "US", locale: "zh-CN" }),
    ).resolves.toEqual({
      market: "US",
      requested_locale: "zh-CN",
      resolved_locale: "en-US",
      currency: "USD",
      timezone: "America/New_York",
      path_prefix: "en-us",
      fallback_policy: "default_locale",
      used_fallback: true,
    });
  });

  it("快照优先使用运行态公开市场数据", async () => {
    const experienceState = {
      listMarkets: vi.fn(() => ({
        items: [
          {
            code: "global",
            default_locale: "en-US",
            currency: "USD",
            timezone: "UTC",
            fallback_locales: ["en-US", "zh-CN"],
            status: "active",
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      })),
      listLocales: vi.fn(() => ({
        items: [
          {
            code: "en-US",
            name: "English (US)",
            market: "global",
            direction: "ltr",
            fallback_locale: null,
            status: "active",
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      })),
      listRoutes: vi.fn(() => ({
        items: [
          {
            market: "global",
            locale: "en-US",
            prefix: "/",
            default: true,
            fallback_chain: ["en-US", "zh-CN"],
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      })),
    };
    const service = new LocalizationService(
      repositoryFor(market("default_locale")),
      experienceState as never,
    );

    await expect(service.snapshot("req-snapshot-1")).resolves.toMatchObject({
      request_id: "req-snapshot-1",
      item: {
        markets: [{ code: "global" }],
        locales: [{ code: "en-US" }],
        routes: [{ prefix: "/" }],
      },
    });
    expect(experienceState.listMarkets).toHaveBeenCalledOnce();
    expect(experienceState.listLocales).toHaveBeenCalledOnce();
    expect(experienceState.listRoutes).toHaveBeenCalledOnce();
  });

  it("hide_untranslated 策略拒绝不存在的 locale", async () => {
    const service = new LocalizationService(
      repositoryFor(market("hide_untranslated")),
    );

    await expect(
      service.resolveMarketContext({ market: "US", locale: "zh-CN" }),
    ).rejects.toMatchObject({ response: { code: "LOCALE_NOT_AVAILABLE" } });
  });

  it("拒绝不存在的市场", async () => {
    const service = new LocalizationService(
      repositoryFor(market("default_locale")),
    );

    await expect(
      service.resolveMarketContext({ market: "CN", locale: "zh-CN" }),
    ).rejects.toMatchObject({ response: { code: "MARKET_NOT_FOUND" } });
  });

  it("管理写入要求 staff 身份和 localization:manage 权限", async () => {
    const repository = repositoryFor(market("default_locale"));
    const service = new LocalizationService(repository);
    const languageInput: UpsertLanguageInput = {
      code: "zh",
      label: "Chinese",
      native_label: "中文",
      status: "active",
    };

    await expect(
      service.upsertLanguage(languageInput, {
        actor: {
          user_id: 10,
          audience: "dealer",
          company_id: 3,
          permissions: ["localization:manage"],
        },
        request_id: "req-dealer-1",
      }),
    ).rejects.toMatchObject({ response: { code: "LOCALIZATION_FORBIDDEN" } });
    await expect(
      service.upsertLanguage(languageInput, staffContext),
    ).resolves.toMatchObject({ code: "zh" });
    expect(repository.upsertLanguage).toHaveBeenCalledOnce();
  });
});
