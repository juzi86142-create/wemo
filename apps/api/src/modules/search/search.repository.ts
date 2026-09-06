export const SEARCH_REPOSITORY = Symbol("SEARCH_REPOSITORY");

export interface SearchRepository {
  search(query: SearchQuery): Promise<SearchResponse>;
  suggest(query: string): Promise<string[]>;
  index(item: SearchableItem): Promise<void>;
}

export interface SearchQuery {
  q: string;
  filters?: Record<string, any>;
  page?: number;
  page_size?: number;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchableItem {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}
