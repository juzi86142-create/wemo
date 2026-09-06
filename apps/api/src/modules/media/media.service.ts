import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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
import { MediaPrismaRepository } from "./media.prisma-repository";
import { MEDIA_REPOSITORY } from "./media.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

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
    private readonly repository: MediaPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listAssets(query: unknown) {
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      this.repository.listAssets({ ...parsed, visibility: "public" }),
    );
  }

  listAdminAssets(query: unknown) {
    this.authorization.requireStaffPermission("media:read");
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      this.repository.listAssets(parsed),
    );
  }

  getAsset(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = this.repository.getAssetByFileKey(parsed.id.toString());
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaAssetMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: asset,
    });
  }

  getSignedUrl(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = this.repository.getAssetByFileKey(parsed.id.toString());
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaSignedUrlResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: { signed_url: `/media/${asset.file_key}` },
    });
  }

  createAsset(body: unknown) {
    const actor = this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(MediaAssetCreateSchema, body);
    const item = this.repository.createAsset(input);

    return MediaAssetMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
