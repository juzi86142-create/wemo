import type {
  MediaAsset,
  MediaAssetCreateInput,
  MediaAssetListQuery,
} from "@wemo/contracts";

export const MEDIA_REPOSITORY = Symbol("MEDIA_REPOSITORY");

export type MediaAssetPage = {
  items: MediaAsset[];
  total: number;
  page: number;
  page_size: number;
};

export interface MediaRepository {
  listAssets(query: MediaAssetListQuery): Promise<MediaAssetPage>;
  listAssetsByVisibilities(
    visibilities: string[],
    query: MediaAssetListQuery,
  ): Promise<MediaAssetPage>;
  getAssetById(id: number): Promise<MediaAsset | null>;
  createAsset(input: MediaAssetCreateInput): Promise<MediaAsset>;
}
