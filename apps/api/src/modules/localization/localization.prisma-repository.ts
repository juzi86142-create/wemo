import { Inject, Injectable } from "@nestjs/common";
import {
  LanguageSchema,
  MarketSchema,
  type Language,
  type Market,
  type Pagination,
  type SaveMarketInput,
  type UpsertLanguageInput,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { ApiHttpException } from "../../http/api-http.exception";
import type {
  LocalizationRepository,
  PageResult,
} from "./localization.repository";

type LanguageRecord = {
  id: number;
  code: string;
  label: string;
  nativeLabel: string;
  status: string;
};

type MarketRecord = {
  id: number;
  code: string;
  currency: string;
  timezone: string;
  settings: unknown;
  status: string;
};

type MarketLocaleRecord = {
  id: number;
  marketId: number;
  languageId: number;
  locale: string;
  pathPrefix: string;
  isDefault: boolean;
  sortOrder: number;
};

function parseFallbackPolicy(settings: unknown) {
  if (
    typeof settings !== "object" ||
    settings === null ||
    !("fallback_policy" in settings) ||
    (settings.fallback_policy !== "default_locale" &&
      settings.fallback_policy !== "hide_untranslated")
  ) {
    return null;
  }
  return settings.fallback_policy;
}

@Injectable()
export class LocalizationPrismaRepository implements LocalizationRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async listPublicLanguages(
    pagination: Pagination,
  ): Promise<PageResult<Language>> {
    const where = { status: "active" };
    const [rows, total] = await Promise.all([
      this.database.language.findMany({
        where,
        orderBy: [{ label: "asc" }, { id: "asc" }],
        skip: (pagination.page - 1) * pagination.page_size,
        take: pagination.page_size,
      }),
      this.database.language.count({ where }),
    ]);

    return { items: rows.map((row) => this.mapLanguage(row)), total };
  }

  async listPublicMarkets(pagination: Pagination): Promise<PageResult<Market>> {
    const where = { status: "active" };
    const [rows, total] = await Promise.all([
      this.database.market.findMany({
        where,
        orderBy: [{ code: "asc" }, { id: "asc" }],
        skip: (pagination.page - 1) * pagination.page_size,
        take: pagination.page_size,
      }),
      this.database.market.count({ where }),
    ]);

    return { items: await this.hydrateMarkets(rows), total };
  }

  async findPublicMarket(code: string): Promise<Market | null> {
    const row = await this.database.market.findFirst({
      where: { code, status: "active" },
    });
    if (!row) return null;

    return (await this.hydrateMarkets([row]))[0] ?? null;
  }

  async upsertLanguage(input: UpsertLanguageInput): Promise<Language> {
    const row = await this.database.$transaction(async (transaction) => {
      const existing = await transaction.language.findUnique({
        where: { code: input.code },
      });
      if (existing && input.status === "inactive") {
        const activeReferences = await transaction.marketLocale.count({
          where: { languageId: existing.id, status: "active" },
        });
        if (activeReferences > 0) {
          throw new ApiHttpException(
            "LOCALIZATION_LANGUAGE_IN_USE",
            "仍被市场使用的语言不能停用",
            409,
          );
        }
      }

      return transaction.language.upsert({
        where: { code: input.code },
        create: {
          code: input.code,
          label: input.label,
          nativeLabel: input.native_label,
          status: input.status,
        },
        update: {
          label: input.label,
          nativeLabel: input.native_label,
          status: input.status,
        },
      });
    });
    return this.mapLanguage(row);
  }

  async saveMarket(input: SaveMarketInput): Promise<Market> {
    const marketId = await this.database.$transaction(async (transaction) => {
      const languageCodes = [
        ...new Set(input.locales.map((locale) => locale.language_code)),
      ];
      const languages = await transaction.language.findMany({
        where: { code: { in: languageCodes }, status: "active" },
      });
      if (languages.length !== languageCodes.length) {
        throw new ApiHttpException(
          "LOCALIZATION_LANGUAGE_NOT_FOUND",
          "市场关联了不存在或已停用的语言",
          409,
        );
      }

      const defaultLocale = input.locales.find((locale) => locale.is_default);
      if (!defaultLocale) {
        throw new ApiHttpException(
          "LOCALIZATION_DEFAULT_REQUIRED",
          "市场必须配置默认 locale",
          400,
        );
      }

      const market = await transaction.market.upsert({
        where: { code: input.code },
        create: {
          code: input.code,
          defaultLocale: defaultLocale.locale,
          currency: input.currency,
          timezone: input.timezone,
          settings: { fallback_policy: input.fallback_policy },
          status: input.status,
        },
        update: {
          defaultLocale: defaultLocale.locale,
          currency: input.currency,
          timezone: input.timezone,
          settings: { fallback_policy: input.fallback_policy },
          status: input.status,
        },
      });

      await transaction.marketLocale.deleteMany({
        where: { marketId: market.id },
      });
      const languageByCode = new Map(
        languages.map((language) => [language.code, language]),
      );
      await transaction.marketLocale.createMany({
        data: input.locales.map((locale) => ({
          marketId: market.id,
          languageId: languageByCode.get(locale.language_code)!.id,
          locale: locale.locale,
          pathPrefix: locale.path_prefix,
          isDefault: locale.is_default,
          sortOrder: locale.sort_order,
          status: "active",
        })),
      });
      return market.id;
    });

    const saved = await this.database.market.findUnique({
      where: { id: marketId },
    });
    if (!saved) {
      throw new ApiHttpException(
        "LOCALIZATION_SAVE_FAILED",
        "市场保存后无法读取",
        500,
      );
    }
    return (await this.hydrateMarkets([saved]))[0]!;
  }

  private async hydrateMarkets(rows: MarketRecord[]): Promise<Market[]> {
    if (rows.length === 0) return [];

    const marketIds = rows.map((row) => row.id);
    const localeRows = await this.database.marketLocale.findMany({
      where: { marketId: { in: marketIds }, status: "active" },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    const languageIds = [
      ...new Set(localeRows.map((locale) => locale.languageId)),
    ];
    const languages = await this.database.language.findMany({
      where: { id: { in: languageIds }, status: "active" },
    });
    const languageById = new Map(
      languages.map((language) => [language.id, language]),
    );

    return rows.map((row) => {
      const fallbackPolicy = parseFallbackPolicy(row.settings);
      if (!fallbackPolicy) {
        throw new ApiHttpException(
          "LOCALIZATION_DATA_INVALID",
          `市场 ${row.code} 的回退配置无效`,
          500,
        );
      }

      const locales = localeRows
        .filter((locale) => locale.marketId === row.id)
        .map((locale) => this.mapMarketLocale(locale, languageById));
      return MarketSchema.parse({
        id: row.id,
        code: row.code,
        currency: row.currency,
        timezone: row.timezone,
        fallback_policy: fallbackPolicy,
        locales,
        status: row.status,
      });
    });
  }

  private mapLanguage(row: LanguageRecord): Language {
    return LanguageSchema.parse({
      id: row.id,
      code: row.code,
      label: row.label,
      native_label: row.nativeLabel,
      status: row.status,
    });
  }

  private mapMarketLocale(
    row: MarketLocaleRecord,
    languageById: Map<number, LanguageRecord>,
  ) {
    const language = languageById.get(row.languageId);
    if (!language) {
      throw new ApiHttpException(
        "LOCALIZATION_DATA_INVALID",
        `locale ${row.locale} 关联了不存在或已停用的语言`,
        500,
      );
    }
    return {
      locale: row.locale,
      language: this.mapLanguage(language),
      path_prefix: row.pathPrefix,
      is_default: row.isDefault,
      sort_order: row.sortOrder,
    };
  }
}
