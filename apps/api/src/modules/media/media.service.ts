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
import { ExperienceRepository } from "../../runtime/experience.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceRepository)
    private readonly stateStore: ExperienceRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listAssets(query: unknown) {
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      await this.stateStore.listMediaAssets({ ...parsed, visibility: "public" }),
    );
  }

  async listAdminAssets(query: unknown) {
    this.authorization.requireStaffPermission("media:read");
    const parsed = parseInput(MediaAssetListQuerySchema, query);
    return MediaAssetListResponseSchema.parse(
      await this.stateStore.listMediaAssets(parsed),
    );
  }

  async getAsset(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = await this.stateStore.getMediaAsset(parsed.id);
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaAssetMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: asset,
    });
  }

  async getSignedUrl(id: unknown) {
    const parsed = parseInput(MediaIdParamSchema, { id });
    const asset = await this.stateStore.getMediaAsset(parsed.id);
    canAccessVisibility(asset.visibility, this.authorization);
    return MediaSignedUrlResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: await this.stateStore.signMediaAsset(parsed.id),
    });
  }

  async createAsset(body: unknown) {
    const actor = this.authorization.requireStaffPermission("media:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(MediaAssetCreateSchema, body);
    const item = await this.stateStore.createMediaAsset(input);

    await this.platformState.recordAudit({
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

