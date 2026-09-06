import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { SETTINGS_REPOSITORY, type SettingsRepository } from "./settings.repository";
import type { SiteSetting, SiteSettingQuery, SiteSettingUpsert } from "@wemo/contracts";

@Injectable()
export class SettingsPrismaRepository implements SettingsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getSettings(query: SiteSettingQuery): Promise<SiteSetting[]> {
    const where: any = {};
    if (query.market) where.market = query.market;
    if (query.locale) where.locale = query.locale;
    if (query.key) where.key = query.key;

    const settings = await this.database.systemSetting.findMany({
      where,
      include: { market: true, locale: true },
    });

    return settings.map(s => this.mapSetting(s));
  }

  async upsertSetting(input: SiteSettingUpsert): Promise<SiteSetting> {
    const existing = await this.database.systemSetting.findFirst({
      where: {
        key: input.key,
        marketId: input.market_id,
        localeId: input.locale_id,
      },
    });

    let setting;
    if (existing) {
      setting = await this.database.systemSetting.update({
        where: { id: existing.id },
        data: {
          value: input.value,
          type: input.type,
          isPublic: input.is_public ?? existing.isPublic,
        },
        include: { market: true, locale: true },
      });
    } else {
      setting = await this.database.systemSetting.create({
        data: {
          key: input.key,
          marketId: input.market_id,
          localeId: input.locale_id,
          value: input.value,
          type: input.type,
          isPublic: input.is_public ?? false,
        },
        include: { market: true, locale: true },
      });
    }

    return this.mapSetting(setting);
  }

  async getPublicSettings(market: string, locale: string, keys: string[]): Promise<SiteSetting[]> {
    const settings = await this.database.systemSetting.findMany({
      where: {
        AND: [
          { market: { code: market } },
          { locale: { code: locale } },
          { key: { in: keys } },
          { isPublic: true },
        ],
      },
      include: { market: true, locale: true },
    });

    return settings.map(s => this.mapSetting(s));
  }

  private mapSetting(setting: any): SiteSetting {
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      type: setting.type,
      market: setting.market?.code || null,
      locale: setting.locale?.code || null,
      is_public: setting.isPublic,
      created_at: setting.createdAt.toISOString(),
      updated_at: setting.updatedAt.toISOString(),
    };
  }
}
