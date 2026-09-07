import type { SearchHit } from "@wemo/contracts";

export const SEARCH_REPOSITORY = Symbol("SEARCH_REPOSITORY");

export interface SearchRepository {
  search(query: SearchQuery): Promise<SearchResponse>;
  suggest(query: string, locale?: string): Promise<string[]>;
  index(item: SearchableItem): Promise<void>;
}

export interface SearchQuery {
  q: string;
  type?: string;
  market?: string;
  locale?: string;
  page: number;
  page_size: number;
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
  page: number;
  page_size: number;
}

export interface SearchableItem {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}
