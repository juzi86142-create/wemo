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
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceStateStore)
    private readonly stateStore: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listAssets(query: unknown) {
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      this.stateStore.listMediaAssets({ ...parsed, visibility: "public" }),
    );
  }

  listAdminAssets(query: unknown) {
    this.authorization.requireStaffPermission("media:read");
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      this.stateStore.listMediaAssets(parsed),
    );
  }

  getAsset(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = this.stateStore.getMediaAsset(parsed.id);
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaAssetMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: asset,
    });
  }

  getSignedUrl(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = this.stateStore.getMediaAsset(parsed.id);
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaSignedUrlResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: this.stateStore.signMediaAsset(parsed.id),
    });
  }

  createAsset(body: unknown) {
    const actor = this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(MediaAssetCreateSchema, body);
    const item = this.stateStore.createMediaAsset(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "media.asset.create",
      entity: "media_asset",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return MediaAssetMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
