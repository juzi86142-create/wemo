import type { ContentEntry, ContentEntryCreateInput, ContentEntryListQuery, ContentEntryUpdateInput, ContentNavigation, FormSubmission, FormSubmissionCreateInput, FormSubmissionListQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const CMS_REPOSITORY = Symbol("CMS_REPOSITORY");

export interface CmsRepository {
  listContentEntries(query: ContentEntryListQuery): Promise<{ items: ContentEntry[]; total: number; page: number; page_size: number }>;
  getContentEntry(market: string, locale: string, slug: string): Promise<ContentEntry | null>;
  createContentEntry(input: ContentEntryCreateInput): Promise<ContentEntry>;
  updateContentEntry(id: number, input: ContentEntryUpdateInput): Promise<ContentEntry>;
  getNavigation(market: string, locale: string): Promise<ContentNavigation[]>;
  listFormSubmissions(query: FormSubmissionListQuery): Promise<{ items: FormSubmission[]; total: number; page: number; page_size: number }>;
  createFormSubmission(input: FormSubmissionCreateInput): Promise<FormSubmission>;
}
