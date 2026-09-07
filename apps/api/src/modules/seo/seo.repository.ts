import type {
  SeoRedirect,
  SeoRedirectCreateInput,
  SeoSitemapEntry,
} from "@wemo/contracts";

export const SEO_REPOSITORY = Symbol("SEO_REPOSITORY");

export type SeoPageQuery = {
  market: string;
  locale: string;
  slug: string;
};

export type SeoPageResult = {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  no_index: boolean;
};

export interface SeoRepository {
  getPageSeo(query: SeoPageQuery): Promise<SeoPageResult | null>;
  listRedirects(): Promise<SeoRedirect[]>;
  upsertRedirect(input: SeoRedirectCreateInput): Promise<SeoRedirect>;
  /** 站点地图真实条目 需求 SEO-004 自动生成排除草稿与noindex */
  listSitemapEntries(): Promise<SeoSitemapEntry[]>;
}
