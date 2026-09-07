import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";
import type {
  ContentEntry,
  ContentEntryCreateInput,
  ContentEntryListQuery,
  ContentEntryUpdateInput,
  ContentEntryVersion,
  ContentNavigation,
  JsonValue,
} from "@wemo/contracts";
import { randomBytes } from "node:crypto";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  CMS_REPOSITORY,
  type ContentEntryPublishCommand,
  type CmsRepository,
} from "./cms.repository";
import { readHashOne, redisNextId, writeHashObject } from "../../runtime/redis-hash";

const PREVIEWS_KEY = `${REDIS_KEY_PREFIX}:cms:previews`;
const PREVIEW_TTL_DAYS = 7;

function versionsKey(entryId: number): string {
  return `${REDIS_KEY_PREFIX}:cms:versions:${entryId}`;
}

type ContentEntryRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["contentEntry"]["findFirst"]>>
>;

const NO_TIMESTAMP_ISO = "1970-01-01T00:00:00.000Z";

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNavigationItems(body: unknown): ContentNavigation["items"] {
  const record = readRecord(body);
  const raw = record?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const entry = readRecord(item);
      if (!entry) return null;
      const label = typeof entry.label === "string" ? entry.label : "";
      const path = typeof entry.url === "string" ? entry.url : "";
      if (label === "" || path === "") return null;
      return {
        id:
          typeof entry.id === "number" ? entry.id : index + 1,
        label,
        path,
        order: typeof entry.order === "number" ? entry.order : index,
        children: Array.isArray(entry.children)
          ? readNavigationItems({ items: entry.children })
          : [],
      } as ContentNavigation["items"][number];
    })
    .filter((item): item is ContentNavigation["items"][number] => item !== null);
}

@Injectable()
export class CmsPrismaRepository implements CmsRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listContentEntries(
    query: ContentEntryListQuery & { status?: string },
  ): Promise<{
    items: ContentEntry[];
    total: number;
    page: number;
    page_size: number;
  }> {
    // 公开列表按生效状态过滤：定时发布到点的条目读取侧即视为已发布
    const publicMode = query.status === "published";
    const where = {
      ...(query.market !== undefined ? { market: query.market } : {}),
      ...(query.locale !== undefined ? { locale: query.locale } : {}),
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(publicMode
        ? { status: { in: ["published", "scheduled"] } }
        : query.status !== undefined
          ? { status: query.status }
          : {}),
    };

    const [entries, total] = await Promise.all([
      this.database.contentEntry.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { updatedAt: "desc" },
      }),
      this.database.contentEntry.count({ where }),
    ]);

    const items = entries
      .map((entry) => this.mapContentEntry(entry))
      .filter((entry) => !publicMode || entry.status === "published");

    return {
      items,
      total: publicMode ? items.length : total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getContentEntry(
    market: string,
    locale: string,
    slug: string,
  ): Promise<ContentEntry | null> {
    const entry = await this.database.contentEntry.findFirst({
      where: { market, locale, slug, status: "published" },
    });

    return entry ? this.mapContentEntry(entry) : null;
  }

  async createContentEntry(
    input: ContentEntryCreateInput,
  ): Promise<ContentEntry> {
    const entry = await this.database.contentEntry.create({
      data: {
        type: input.type,
        locale: input.locale,
        market: input.market,
        slug: input.slug,
        title: input.title,
        body: input.body as never,
        seo: (input.seo ?? {}) as never,
        status: input.status ?? "draft",
        translationStatus: input.translation_status ?? "published",
      },
    });

    return this.mapContentEntry(entry);
  }

  async updateContentEntry(
    id: number,
    input: ContentEntryUpdateInput & { status?: string },
  ): Promise<ContentEntry> {
    // 更新前快照为版本历史 需求 ADM-C-005
    await this.pushVersion(id);

    const entry = await this.database.contentEntry.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body as never } : {}),
        ...(input.seo !== undefined ? { seo: input.seo as never } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.translation_status !== undefined
          ? { translationStatus: input.translation_status }
          : {}),
      },
    });

    return this.mapContentEntry(entry);
  }

  async publishContentEntry(
    id: number,
    input: ContentEntryPublishCommand,
  ): Promise<ContentEntry> {
    await this.pushVersion(id);
    const now = new Date();
    const publishAt = input.publish_at ? new Date(input.publish_at) : null;
    const archiveAt = input.archive_at ? new Date(input.archive_at) : null;

    const data: Record<string, unknown> = {};
    if (archiveAt !== null && archiveAt <= now) {
      data.status = "archived";
      data.archivedAt = archiveAt;
    } else {
      if (archiveAt !== null) {
        data.archivedAt = archiveAt;
      }
      if (publishAt !== null && publishAt > now) {
        data.status = "scheduled";
        data.publishedAt = publishAt;
      } else {
        data.status = "published";
        data.publishedAt = now;
      }
    }

    const entry = await this.database.contentEntry.update({
      where: { id },
      data: data as never,
    });

    return this.mapContentEntry(entry);
  }

  async getContentEntryById(id: number): Promise<ContentEntry | null> {
    const entry = await this.database.contentEntry.findUnique({ where: { id } });
    return entry ? this.mapContentEntry(entry) : null;
  }

  async createPreviewToken(entryId: number): Promise<{ token: string; expires_at: string }> {
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    await writeHashObject(this.redis, PREVIEWS_KEY, token, {
      entry_id: entryId,
      expires_at: expiresAt.toISOString(),
    });
    return { token, expires_at: expiresAt.toISOString() };
  }

  async getEntryIdByPreviewToken(token: string): Promise<number | null> {
    const preview = await readHashOne<{ entry_id: number; expires_at: string }>(
      this.redis,
      PREVIEWS_KEY,
      token,
      (raw) => JSON.parse(raw) as { entry_id: number; expires_at: string },
    );
    if (!preview) return null;
    if (new Date(preview.expires_at) < new Date()) return null;
    return preview.entry_id;
  }

  async listVersions(entryId: number): Promise<ContentEntryVersion[]> {
    const raw = await this.redis.lrange(versionsKey(entryId), 0, -1);
    return raw
      .map((item) => JSON.parse(item) as ContentEntryVersion)
      .sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  }

  /** 更新前快照当前内容 追加到该条目的版本列表 */
  private async pushVersion(entryId: number): Promise<void> {
    const entry = await this.database.contentEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      throw new NotFoundException("内容条目不存在");
    }
    const version: ContentEntryVersion = {
      id: await redisNextId(this.redis, `${REDIS_KEY_PREFIX}:cms:versions:next`),
      entry_id: entryId,
      body: entry.body as JsonValue,
      seo: entry.seo as ContentEntryVersion["seo"],
      status: entry.status as ContentEntryVersion["status"],
      saved_at: new Date().toISOString(),
    };
    await this.redis.rpush(versionsKey(entryId), JSON.stringify(version));
  }

  async getNavigation(
    market: string,
    locale: string,
  ): Promise<ContentNavigation[]> {
    const entries = await this.database.contentEntry.findMany({
      where: {
        market,
        locale,
        type: "navigation",
        status: "published",
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      market: entry.market,
      locale: entry.locale,
      status: entry.status as ContentNavigation["status"],
      items: readNavigationItems(entry.body),
      created_at: NO_TIMESTAMP_ISO,
      updated_at: entry.updatedAt.toISOString(),
    }));
  }

  /** 定时发布/下线在读取侧按时间点生效 无后台调度器（需求 ADM-C-003） */
  private effectiveStatus(entry: ContentEntryRow): ContentEntry["status"] {
    const now = new Date();
    if (entry.status === "scheduled" && entry.publishedAt && entry.publishedAt <= now) {
      return "published";
    }
    if (entry.archivedAt && entry.archivedAt <= now) {
      return "archived";
    }
    return entry.status as ContentEntry["status"];
  }

  private mapContentEntry(entry: ContentEntryRow): ContentEntry {
    return {
      id: entry.id,
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      body: entry.body as JsonValue,
      seo: entry.seo as ContentEntry["seo"],
      status: this.effectiveStatus(entry),
      locale: entry.locale,
      market: entry.market,
      translation_status: entry.translationStatus as ContentEntry["translation_status"],
      linked_product_ids: [],
      media_asset_ids: [],
      published_at: entry.publishedAt?.toISOString() ?? null,
      archived_at: entry.archivedAt?.toISOString() ?? null,
      created_at: NO_TIMESTAMP_ISO,
      updated_at: entry.updatedAt.toISOString(),
    };
  }

}
