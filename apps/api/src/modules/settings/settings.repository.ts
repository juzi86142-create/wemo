import type { PlatformSetting, PlatformSettingMutation } from "@wemo/contracts";

export const SETTINGS_REPOSITORY = Symbol("SETTINGS_REPOSITORY");

export type SettingsQuery = {
  group_name?: string;
  key?: string;
};

export interface SettingsRepository {
  getSettings(query: SettingsQuery): Promise<PlatformSetting[]>;
  upsertSetting(input: PlatformSettingMutation): Promise<PlatformSetting>;
  getPublicSettings(keys: string[]): Promise<PlatformSetting[]>;
}
