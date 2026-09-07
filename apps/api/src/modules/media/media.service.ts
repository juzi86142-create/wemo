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
import { z } from "zod";

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

  async createAsset(body: unknown) {
    this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(MediaAssetCreateSchema, body);
    const item = await this.repository.createAsset(input);

    return MediaAssetMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
