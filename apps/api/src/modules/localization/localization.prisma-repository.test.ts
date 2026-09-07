import type { SaveMarketInput } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";
import { describe, expect, it, vi } from "vitest";

import { LocalizationPrismaRepository } from "./localization.prisma-repository";

const languageRow = {
  id: 1,
  code: "en",
  label: "English",
  nativeLabel: "English",
  status: "active",
  createdAt: new Date("2026-09-04T00:00:00Z"),
  updatedAt: new Date("2026-09-04T00:00:00Z"),
};
const marketRow = {
  id: 2,
  code: "US",
  defaultLocale: "en-US",
  currency: "USD",
  timezone: "America/New_York",
  settings: { fallback_policy: "default_locale" },
  status: "active",
};
const localeRow = {
  id: 3,
  marketId: 2,
  languageId: 1,
  locale: "en-US",
  pathPrefix: "en-us",
  isDefault: true,
  sortOrder: 0,
  status: "active",
};
const input: SaveMarketInput = {
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
      sort_order: 0,
    },
  ],
  status: "active",
};

function createDatabaseDouble(options?: {
  transactionLanguages?: (typeof languageRow)[];
  languageReferences?: number;
}) {
  const transaction = {
    language: {
      findMany: vi.fn(
        async () => options?.transactionLanguages ?? [languageRow],
      ),
      findUnique: vi.fn(async () => languageRow),
      upsert: vi.fn(async () => languageRow),
    },
    market: { upsert: vi.fn(async () => marketRow) },
    marketLocale: {
      count: vi.fn(async () => options?.languageReferences ?? 0),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  const database = {
    $transaction: vi.fn(
      async (
        operation: (client: typeof transaction) => Promise<unknown>,
      ): Promise<unknown> => operation(transaction),
    ),
    market: {
      findUnique: vi.fn(async () => marketRow),
      findFirst: vi.fn(async () => marketRow),
      findMany: vi.fn(async () => [marketRow]),
      count: vi.fn(async () => 1),
    },
    marketLocale: { findMany: vi.fn(async () => [localeRow]) },
    language: {
      findMany: vi.fn(async () => [languageRow]),
      count: vi.fn(async () => 1),
    },
  };

  return {
    database: database as unknown as DatabaseClient,
    transaction,
  };
}

describe("LocalizationPrismaRepository", () => {
  it("在同一事务内检查语言并替换市场 locale 关联", async () => {
    const { database, transaction } = createDatabaseDouble();
    const repository = new LocalizationPrismaRepository(database);

    await expect(repository.saveMarket(input)).resolves.toMatchObject({
      code: "US",
      locales: [{ locale: "en-US", language: { code: "en" } }],
    });
    expect(transaction.language.findMany).toHaveBeenCalledWith({
      where: { code: { in: ["en"] }, status: "active" },
    });
    expect(transaction.marketLocale.deleteMany).toHaveBeenCalledWith({
      where: { marketId: 2 },
    });
    expect(transaction.marketLocale.createMany).toHaveBeenCalledWith({
      data: [
        {
          marketId: 2,
          languageId: 1,
          locale: "en-US",
          pathPrefix: "en-us",
          isDefault: true,
          sortOrder: 0,
          status: "active",
        },
      ],
    });
  });

  it("拒绝市场关联不存在或已停用的语言", async () => {
    const { database, transaction } = createDatabaseDouble({
      transactionLanguages: [],
    });
    const repository = new LocalizationPrismaRepository(database);

    await expect(repository.saveMarket(input)).rejects.toMatchObject({
      response: { code: "LOCALIZATION_LANGUAGE_NOT_FOUND" },
    });
    expect(transaction.market.upsert).not.toHaveBeenCalled();
  });

  it("拒绝停用仍被活动市场关联的语言", async () => {
    const { database, transaction } = createDatabaseDouble({
      languageReferences: 1,
    });
    const repository = new LocalizationPrismaRepository(database);

    await expect(
      repository.upsertLanguage({
        code: "en",
        label: "English",
        native_label: "English",
        status: "inactive",
      }),
    ).rejects.toMatchObject({
      response: { code: "LOCALIZATION_LANGUAGE_IN_USE" },
    });
    expect(transaction.language.upsert).not.toHaveBeenCalled();
  });
});
