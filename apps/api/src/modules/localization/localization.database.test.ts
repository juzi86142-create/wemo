import { createDatabase, type DatabaseClient } from "@wemo/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LocalizationPrismaRepository } from "./localization.prisma-repository";
import { LocalizationService } from "./localization.service";

const runIntegration = process.env.RUN_DATABASE_INTEGRATION === "1";
const describeDatabase = runIntegration ? describe : describe.skip;

describeDatabase("Localization PostgreSQL 集成", () => {
  let database: DatabaseClient;
  let service: LocalizationService;

  beforeAll(() => {
    database = createDatabase();
    service = new LocalizationService(
      new LocalizationPrismaRepository(database),
    );
  });

  afterAll(async () => {
    const market = await database.market.findUnique({ where: { code: "TST" } });
    if (market) {
      await database.marketLocale.deleteMany({
        where: { marketId: market.id },
      });
      await database.market.delete({ where: { id: market.id } });
    }
    await database.language.deleteMany({ where: { code: "zz" } });
    await database.$disconnect();
  });

  it("经真实 Prisma 事务保存并解析语言市场配置", async () => {
    const context = {
      actor: {
        user_id: 1,
        audience: "staff" as const,
        permissions: ["localization:manage"],
      },
      request_id: "req-db-integration",
    };

    await service.upsertLanguage(
      {
        code: "zz",
        label: "Integration Test Language",
        native_label: "Integration Test Language",
        status: "active",
      },
      context,
    );
    await service.saveMarket(
      {
        code: "TST",
        currency: "USD",
        timezone: "UTC",
        fallback_policy: "hide_untranslated",
        locales: [
          {
            locale: "zz-TT",
            language_code: "zz",
            path_prefix: "zz-tt",
            is_default: true,
            sort_order: 0,
          },
        ],
        status: "active",
      },
      context,
    );

    await expect(
      service.resolveMarketContext({ market: "TST", locale: "zz-TT" }),
    ).resolves.toEqual({
      market: "TST",
      requested_locale: "zz-TT",
      resolved_locale: "zz-TT",
      currency: "USD",
      timezone: "UTC",
      path_prefix: "zz-tt",
      fallback_policy: "hide_untranslated",
      used_fallback: false,
    });
  });
});
