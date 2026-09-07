import type {
  ContentEntry,
  ContentEntryCreateInput,
  ContentEntryListQuery,
  ContentEntryUpdateInput,
  ContentEntryVersion,
  ContentNavigation,
} from "@wemo/contracts";

export const CMS_REPOSITORY = Symbol("CMS_REPOSITORY");

export interface ContentEntryPublishCommand {
  publish_at?: string | undefined;
  archive_at?: string | undefined;
}

export interface CmsRepository {
  listContentEntries(query: ContentEntryListQuery): Promise<{ items: ContentEntry[]; total: number; page: number; page_size: number }>;
  getContentEntry(market: string, locale: string, slug: string): Promise<ContentEntry | null>;
  createContentEntry(input: ContentEntryCreateInput): Promise<ContentEntry>;
  updateContentEntry(id: number, input: ContentEntryUpdateInput): Promise<ContentEntry>;
  publishContentEntry(id: number, input: ContentEntryPublishCommand): Promise<ContentEntry>;
  getContentEntryById(id: number): Promise<ContentEntry | null>;
  getNavigation(market: string, locale: string): Promise<ContentNavigation[]>;
  /** 预览令牌与版本历史持久化在 Redis 需求 ADM-C-004/005 */
  createPreviewToken(entryId: number): Promise<{ token: string; expires_at: string }>;
  getEntryIdByPreviewToken(token: string): Promise<number | null>;
  listVersions(entryId: number): Promise<ContentEntryVersion[]>;
}
