import type {
  ContentEntry,
  ContentEntryCreateInput,
  ContentEntryListQuery,
  ContentEntryUpdateInput,
  ContentNavigation,
} from "@wemo/contracts";

export const CMS_REPOSITORY = Symbol("CMS_REPOSITORY");

export interface CmsRepository {
  listContentEntries(query: ContentEntryListQuery): Promise<{ items: ContentEntry[]; total: number; page: number; page_size: number }>;
  getContentEntry(market: string, locale: string, slug: string): Promise<ContentEntry | null>;
  createContentEntry(input: ContentEntryCreateInput): Promise<ContentEntry>;
  updateContentEntry(id: number, input: ContentEntryUpdateInput): Promise<ContentEntry>;
  getNavigation(market: string, locale: string): Promise<ContentNavigation[]>;
}
