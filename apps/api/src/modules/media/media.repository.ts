import type { MediaAsset, MediaAssetCreateInput, MediaAssetListQuery, MediaAssetListResponse } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const MEDIA_REPOSITORY = Symbol("MEDIA_REPOSITORY");

export interface MediaRepository {
  listAssets(query: MediaAssetListQuery): Promise<MediaAssetListResponse>;
  getAssetByFileKey(fileKey: string): Promise<MediaAsset | null>;
  createAsset(input: MediaAssetCreateInput): Promise<MediaAsset>;
  updateAsset(fileKey: string, input: Partial<MediaAssetCreateInput>): Promise<MediaAsset>;
}
