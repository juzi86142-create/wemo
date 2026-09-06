import type { SeoMetadata, SeoQuery, SeoResult } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const SEO_REPOSITORY = Symbol("SEO_REPOSITORY");

export interface SeoRepository {
  getPageSeo(query: SeoQuery): Promise<SeoResult | null>;
  savePageSeo(input: SeoMetadata): Promise<SeoMetadata>;
  listSeoPages(query: any): Promise<{ items: SeoMetadata[]; total: number; page: number; page_size: number }>;
}
