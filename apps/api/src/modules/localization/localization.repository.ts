import type {
  Language,
  Market,
  Pagination,
  SaveMarketInput,
  UpsertLanguageInput,
} from "@wemo/contracts";

export const LOCALIZATION_REPOSITORY = Symbol("LOCALIZATION_REPOSITORY");

export type PageResult<Item> = { items: Item[]; total: number };

export interface LocalizationRepository {
  listPublicLanguages(pagination: Pagination): Promise<PageResult<Language>>;
  listPublicMarkets(pagination: Pagination): Promise<PageResult<Market>>;
  findPublicMarket(code: string): Promise<Market | null>;
  upsertLanguage(input: UpsertLanguageInput): Promise<Language>;
  saveMarket(input: SaveMarketInput): Promise<Market>;
}
