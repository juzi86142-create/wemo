import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { MEDIA_REPOSITORY, type MediaRepository } from "./media.repository";
import type { MediaAsset } from "@wemo/contracts";

@Injectable()
export class MediaPrismaRepository implements MediaRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listAssets(query: any): Promise<any> {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.visibility) where.visibility = query.visibility;

    const [assets, total] = await Promise.all([
      this.database.mediaAsset.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.mediaAsset.count({ where }),
    ]);

    return {
      items: assets.map(a => this.mapAsset(a)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getAssetByFileKey(fileKey: string): Promise<MediaAsset | null> {
    const asset = await this.database.mediaAsset.findUnique({
      where: { fileKey },
    });

    return asset ? this.mapAsset(asset) : null;
  }

  async createAsset(input: any): Promise<MediaAsset> {
    const asset = await this.database.mediaAsset.create({
      data: {
        type: input.type,
        fileKey: input.file_key,
        mime: input.mime,
        size: input.size,
        checksum: input.checksum,
        alt: input.alt,
        visibility: input.visibility ?? "private",
        metadata: input.metadata ?? {},
      },
    });

    return this.mapAsset(asset);
  }

  async updateAsset(fileKey: string, input: any): Promise<MediaAsset> {
    const asset = await this.database.mediaAsset.update({
      where: { fileKey },
      data: {
        alt: input.alt,
        visibility: input.visibility,
        metadata: input.metadata,
      },
    });

    return this.mapAsset(asset);
  }

  private mapAsset(asset: any): MediaAsset {
    return {
      id: asset.id,
      file_key: asset.fileKey,
      type: asset.type,
      mime: asset.mime,
      size: asset.size,
      checksum: asset.checksum,
      alt: asset.alt,
      visibility: asset.visibility,
      version: asset.version,
      metadata: asset.metadata,
      created_at: asset.createdAt.toISOString(),
    };
  }
}
