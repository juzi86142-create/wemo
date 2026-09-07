import { Inject, Injectable } from "@nestjs/common";
import type { JsonValue, PlatformSetting, PlatformSettingMutation } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { WemoHttpException } from "../../runtime/validation";
import type { SettingsQuery, SettingsRepository } from "./settings.repository";

type SystemSettingRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["systemSetting"]["findFirst"]>>
>;

/** Demo：输入未携带 updatedBy（更新人）时记系统账号 1 */
const SYSTEM_ACTOR_ID = 1;

@Injectable()
export class SettingsPrismaRepository implements SettingsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async getSettings(query: SettingsQuery): Promise<PlatformSetting[]> {
    const where: Record<string, unknown> = {};
    if (query.group_name !== undefined) where.groupName = query.group_name;
    if (query.key !== undefined) where.key = query.key;

    const rows = await this.database.systemSetting.findMany({
      where: where as never,
      orderBy: [{ groupName: "asc" }, { key: "asc" }],
    });
    return rows.map((row) => this.mapRow(row));
  }

  async upsertSetting(input: PlatformSettingMutation): Promise<PlatformSetting> {
    const existing = await this.database.systemSetting.findUnique({
      where: {
        groupName_key: { groupName: input.group_name, key: input.key },
      },
    });

    if (
      input.expected_version !== undefined &&
      existing &&
      existing.version !== input.expected_version
    ) {
      throw new WemoHttpException(
        "SETTING_VERSION_CONFLICT",
        "设置已被其他请求修改，请刷新后重试", [], 409);
    }

    const nextVersion = existing
      ? String(Number(existing.version) + 1)
      : "1";
    const row = existing
      ? await this.database.systemSetting.update({
          where: { id: existing.id },
          data: {
            // JsonValue → Prisma InputJsonValue 的相互转换，运行期由数据库 JSON 列兜底
            value: input.value as never,
            version: nextVersion,
            updatedBy: SYSTEM_ACTOR_ID,
          },
        })
      : await this.database.systemSetting.create({
          data: {
            groupName: input.group_name,
            key: input.key,
            value: input.value as never,
            version: nextVersion,
            updatedBy: SYSTEM_ACTOR_ID,
          },
        });

    return this.mapRow(row);
  }

  async getPublicSettings(keys: string[]): Promise<PlatformSetting[]> {
    // Demo：is_sensitive 不落库，所有设置均可视为公开可读，提供 keys 时仅返回这些 key
    const rows = await this.database.systemSetting.findMany({
      where:
        keys.length > 0
          ? { key: { in: keys } }
          : {},
      orderBy: [{ groupName: "asc" }, { key: "asc" }],
    });
    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: SystemSettingRow): PlatformSetting {
    return {
      id: row.id,
      group_name: row.groupName,
      key: row.key,
      value: row.value as JsonValue,
      version: row.version,
      updated_by: row.updatedBy ?? SYSTEM_ACTOR_ID,
      updated_at: row.updatedAt.toISOString(),
      is_sensitive: false,
    };
  }
}
