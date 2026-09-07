import { describe, expect, it } from "vitest";

import {
  AnalyticsEventSchema,
  MarketContextSchema,
  PublicPlatformConfigSchema,
  SaveMarketSchema,
} from "./index.js";

describe("平台契约", () => {
  it("接受语言与市场分离且只有一个默认 locale 的配置", () => {
    const parsed = SaveMarketSchema.parse({
      code: "US",
      currency: "USD",
      timezone: "America/New_York",
      fallback_policy: "default_locale",
      locales: [
        {
          locale: "en-US",
          language_code: "en",
          path_prefix: "en-us",
          is_default: true,
        },
        {
          locale: "zh-CN",
          language_code: "zh",
          path_prefix: "zh-cn",
          is_default: false,
          sort_order: 10,
        },
      ],
      status: "active",
    });

    expect(parsed.locales[0]?.sort_order).toBe(0);
  });

  it("拒绝重复路径或缺少唯一默认 locale 的市场配置", () => {
    const result = SaveMarketSchema.safeParse({
      code: "US",
      currency: "USD",
      timezone: "America/New_York",
      fallback_policy: "hide_untranslated",
      locales: [
        {
          locale: "en-US",
          language_code: "en",
          path_prefix: "en-us",
          is_default: false,
          sort_order: 0,
        },
        {
          locale: "zh-CN",
          language_code: "zh",
          path_prefix: "en-us",
          is_default: false,
          sort_order: 1,
        },
      ],
      status: "active",
    });

    expect(result.success).toBe(false);
  });

  it("解析有类型参数的核心分析事件", () => {
    const event = AnalyticsEventSchema.parse({
      event_id: "evt-1",
      request_id: "req-1",
      name: "purchase",
      occurred_at: "2026-09-04T10:00:00+08:00",
      context: {
        market: "CN",
        language: "zh",
        device: "mobile",
        role: "user",
      },
      properties: { order_id: 8, revenue: 12900, channel: "b2c" },
    });

    expect(event.name).toBe("purchase");
    expect(
      AnalyticsEventSchema.safeParse({
        ...event,
        properties: { order_id: 8, revenue: -1, channel: "b2c" },
      }).success,
    ).toBe(false);
  });

  it("公开配置和市场上下文拒绝敏感或未知字段", () => {
    const market = {
      id: 1,
      code: "US",
      currency: "USD",
      timezone: "America/New_York",
      fallback_policy: "default_locale" as const,
      locales: [
        {
          locale: "en-US",
          language: {
            id: 1,
            code: "en",
            label: "English",
            native_label: "English",
            status: "active" as const,
          },
          path_prefix: "en-us",
          is_default: true,
          sort_order: 0,
        },
      ],
      status: "active" as const,
    };

    expect(
      PublicPlatformConfigSchema.safeParse({
        version: "1",
        markets: [market],
        feature_flags: { b2c_enabled: true },
        generated_at: "2026-09-04T10:00:00+08:00",
        payment_secret: "must-not-leak",
      }).success,
    ).toBe(false);
    expect(
      MarketContextSchema.parse({
        market: "US",
        requested_locale: "zh-CN",
        resolved_locale: "en-US",
        currency: "USD",
        timezone: "America/New_York",
        path_prefix: "en-us",
        fallback_policy: "default_locale",
        used_fallback: true,
      }).used_fallback,
    ).toBe(true);
  });
});
