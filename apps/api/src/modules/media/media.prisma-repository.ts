import { Inject, Injectable } from "@nestjs/common";
import type {
  JsonValue,
  MediaAsset,
  MediaAssetCreateInput,
  MediaAssetListQuery,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import type { MediaAssetPage, MediaRepository } from "./media.repository";

type MediaAssetRow = NonNullable<
  Awaited<ReturnType<DatabaseClient["mediaAsset"]["findFirst"]>>
>;

@Injectable()
export class MediaPrismaRepository implements MediaRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  async listAssets(query: MediaAssetListQuery): Promise<MediaAssetPage> {
    const where: Record<string, unknown> = {};
    if (query.visibility !== undefined) where.visibility = query.visibility;
    if (query.type !== undefined) where.type = query.type;
    if (query.q !== undefined) {
      where.OR = [{ fileKey: { contains: query.q } }, { alt: { contains: query.q } }];
    }

    const [rows, total] = await Promise.all([
      this.database.mediaAsset.findMany({
        where: where as never,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.mediaAsset.count({ where: where as never }),
    ]);

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getAssetById(id: number): Promise<MediaAsset | null> {
    const row = await this.database.mediaAsset.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  async createAsset(input: MediaAssetCreateInput): Promise<MediaAsset> {
    const row = await this.database.mediaAsset.create({
      data: {
        type: input.type,
        fileKey: input.file_key,
        mime: input.mime,
        size: input.size,
        checksum: input.checksum,
        alt: input.alt ?? null,
        visibility: input.visibility,
        metadata: (input.metadata ?? {}) as never,
      },
    });
    return this.mapRow(row);
  }

  private mapRow(row: MediaAssetRow): MediaAsset {
    return {
      id: row.id,
      type: row.type,
      file_key: row.fileKey,
      mime: row.mime,
      size: row.size,
      checksum: row.checksum,
      alt: row.alt,
      visibility: row.visibility as MediaAsset["visibility"],
      tags: [],
      versions: [
        {
          version: row.version,
          file_key: row.fileKey,
          mime: row.mime,
          size: row.size,
          checksum: row.checksum,
          created_at: row.createdAt.toISOString(),
        },
      ],
      metadata: row.metadata as JsonValue,
      created_at: row.createdAt.toISOString(),
      updated_at: row.createdAt.toISOString(),
    };
  }
}
