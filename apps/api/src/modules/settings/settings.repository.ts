import type { SiteSetting, SiteSettingQuery, SiteSettingUpsert } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const SETTINGS_REPOSITORY = Symbol("SETTINGS_REPOSITORY");

export interface SettingsRepository {
  getSettings(query: SiteSettingQuery): Promise<SiteSetting[]>;
  upsertSetting(input: SiteSettingUpsert): Promise<SiteSetting>;
  getPublicSettings(market: string, locale: string, keys: string[]): Promise<SiteSetting[]>;
}
