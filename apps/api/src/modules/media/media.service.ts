import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MediaAssetCreateSchema,
  MediaAssetListQuerySchema,
  MediaAssetListResponseSchema,
  MediaAssetMutationResponseSchema,
  MediaSignedUrlResponseSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import type { MediaAsset } from "@wemo/contracts/content";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

import { AUDIT_REPOSITORY, type AuditRepository } from "../audit/audit.repository";
import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { MEDIA_REPOSITORY, type MediaRepository } from "./media.repository";
import { RequestContextStore } from "../../runtime/request-context.store";

const MediaIdParamSchema = z.object({
  id: EntityIdSchema,
});

function canAccessVisibility(
  visibility: "public" | "registered" | "dealer" | "internal",
  authorization: AuthorizationService,
): void {
  if (visibility === "public") {
    return;
  }
  const actor = authorization.requireActor();
  if (visibility === "registered") {
    return;
  }
  if (visibility === "dealer") {
    if (actor.audience === "dealer" || actor.audience === "staff") {
      return;
    }
    throw new ForbiddenException("当前账号无权访问该媒体");
  }
  if (actor.audience !== "staff") {
    throw new ForbiddenException("当前账号无权访问该媒体");
  }
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly repository: MediaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listAssets(query: unknown) {
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    const result = await this.repository.listAssets({
      ...parsed,
      visibility: "public",
    });
    return MediaAssetListResponseSchema.parse(result);
  }

  async listAdminAssets(query: unknown) {
    this.authorization.requireStaffPermission("media:read");
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    const result = await this.repository.listAssets(parsed);
    return MediaAssetListResponseSchema.parse(result);
  }

  async listDownloads(query: unknown) {
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    const result = await this.repository.listAssetsByVisibilities(
      ["public"],
      parsed,
    );
    return MediaAssetListResponseSchema.parse(result);
  }

  async listDealerDownloads(query: unknown) {
    this.authorization.requireAudience("dealer", "staff");
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    const result = await this.repository.listAssetsByVisibilities(
      ["public", "dealer"],
      parsed,
    );
    return MediaAssetListResponseSchema.parse(result);
  }

  async getAsset(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = await this.repository.getAssetById(parsed.id);
    if (!asset) {
      throw new NotFoundException("媒体资源不存在");
    }
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaAssetMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: asset,
    });
  }

  async getSignedUrl(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = await this.repository.getAssetById(parsed.id);
    if (!asset) {
      throw new NotFoundException("媒体资源不存在");
    }
    canAccessVisibility(asset.visibility, this.authorization);
    const baseUrl =
      process.env.STOREFRONT_URL ?? "http://localhost:3000";
    return MediaSignedUrlResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      // Demo：文件二进制不上传对象存储，签发指向门户静态资源的链接
      item: {
        asset_id: asset.id,
        url: `${baseUrl}/media/${encodeURIComponent(asset.file_key)}`,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        method: "GET",
      },
    });
  }

  /** 媒体文件上传 需求 7.11 文件落本地媒体目录并登记资产 */
  async uploadAsset(request: unknown) {
    const actor = this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const fastifyRequest = request as {
      file: () => Promise<{
        filename: string;
        mimetype: string;
        file: NodeJS.ReadableStream;
      } | undefined>;
      body: Record<string, unknown>;
    };

    const part = await fastifyRequest.file();
    if (!part) {
      throw new NotFoundException("缺少上传文件");
    }
    const filename = part.filename;
    const raw = fastifyRequest.body ?? {};
    const visibility = String(raw.visibility ?? "public");
    const type = String(raw.type ?? "asset");
    const alt =
      typeof raw.alt === "string" && raw.alt.length > 0 ? raw.alt : null;
    const tagsRaw = raw.tags;
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw.filter((tag): tag is string => typeof tag === "string")
      : [];

    const mediaDir = process.env.MEDIA_DIR ?? "uploads";
    const dir = resolve(process.cwd(), mediaDir);
    await mkdir(dir, { recursive: true });
    const key = `${Date.now()}-${filename}`;
    const target = resolve(dir, key);

    const hash = createHash("sha256");
    let size = 0;
    await new Promise<void>((resolveWrite, rejectWrite) => {
      const sink = createWriteStream(target);
      part.file.on("data", (chunk: Buffer) => {
        hash.update(chunk);
        size += chunk.length;
      });
      part.file.on("error", rejectWrite);
      part.file.pipe(sink);
      sink.on("finish", resolveWrite);
      sink.on("error", rejectWrite);
    });

    const item = await this.repository.createAsset({
      type,
      file_key: key,
      mime: part.mimetype || "application/octet-stream",
      size,
      checksum: hash.digest("hex"),
      alt,
      visibility: visibility as MediaAsset["visibility"],
      tags,
      metadata: { original_name: filename },
    });

    await this.auditRepository.recordLog({
      actor_id: actor.user_id,
      action: "media.upload",
      entity: "media_asset",
      entity_id: item.id,
      after: { file_key: item.file_key, size: item.size },
      request_id: context.request_id,
    });

    return MediaAssetMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async createAsset(body: unknown) {
    const actor = this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(MediaAssetCreateSchema, body);
    const item = await this.repository.createAsset(input);
    await this.auditRepository.recordLog({
      actor_id: actor.user_id,
      action: "media.create",
      entity: "media_asset",
      entity_id: item.id,
      after: { file_key: item.file_key, visibility: item.visibility },
      request_id: context.request_id,
    });

    return MediaAssetMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
