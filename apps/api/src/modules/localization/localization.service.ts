import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import {
  LanguageListResponseSchema,
  MarketContextSchema,
  MarketListResponseSchema,
  PaginationSchema,
  LocalizationSnapshotSchema,
  RequestIdSchema,
  ResolveMarketContextQuerySchema,
  SaveMarketSchema,
  SessionActorSchema,
  UpsertLanguageSchema,
  type SaveMarketInput,
  type SessionActor,
  type UpsertLanguageInput,
} from "@wemo/contracts";

import { ApiHttpException } from "../../http/api-http.exception";
import { ExperienceStateStore } from "../../runtime/experience.state";
import {
  LOCALIZATION_REPOSITORY,
  type LocalizationRepository,
} from "./localization.repository";

export type LocalizationManagementContext = {
  actor: SessionActor;
  request_id: string;
};

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);

  constructor(
    @Inject(LOCALIZATION_REPOSITORY)
    private readonly repository: LocalizationRepository,
    @Optional()
    @Inject(ExperienceStateStore)
    private readonly experienceState?: ExperienceStateStore,
  ) {}

  async listLanguages(input: unknown) {
    const pagination = PaginationSchema.parse(input);
    const result = await this.repository.listPublicLanguages(pagination);
    return LanguageListResponseSchema.parse({ ...pagination, ...result });
  }

  async listMarkets(input: unknown) {
    const pagination = PaginationSchema.parse(input);
    const result = await this.repository.listPublicMarkets(pagination);
    return MarketListResponseSchema.parse({ ...pagination, ...result });
  }

  async snapshot(requestId: string) {
    const snapshot = this.experienceState
      ? this.buildRuntimeSnapshot()
      : await this.buildRepositorySnapshot();

    return LocalizationSnapshotSchema.parse({
      request_id: RequestIdSchema.parse(requestId),
      item: snapshot,
    });
  }

  async resolveMarketContext(input: unknown) {
    const query = ResolveMarketContextQuerySchema.parse(input);
    const market = await this.repository.findPublicMarket(query.market);
    if (!market) {
      throw new ApiHttpException(
        "MARKET_NOT_FOUND",
        "市场不存在或尚未启用",
        404,
      );
    }

    const requested = market.locales.find(
      (locale) => locale.locale === query.locale,
    );
    const resolved =
      requested ??
      (market.fallback_policy === "default_locale"
        ? market.locales.find((locale) => locale.is_default)
        : undefined);
    if (!resolved) {
      throw new ApiHttpException(
        "LOCALE_NOT_AVAILABLE",
        "该市场未提供请求的语言版本",
        404,
      );
    }

    return MarketContextSchema.parse({
      market: market.code,
      requested_locale: query.locale,
      resolved_locale: resolved.locale,
      currency: market.currency,
      timezone: market.timezone,
      path_prefix: resolved.path_prefix,
      fallback_policy: market.fallback_policy,
      used_fallback: !requested,
    });
  }

  async upsertLanguage(
    input: UpsertLanguageInput,
    context: LocalizationManagementContext,
  ) {
    const authorizedContext = this.authorizeManagement(context);
    const saved = await this.repository.upsertLanguage(
      UpsertLanguageSchema.parse(input),
    );
    this.logManagementChange("language_saved", saved.code, authorizedContext);
    return saved;
  }

  async saveMarket(
    input: SaveMarketInput,
    context: LocalizationManagementContext,
  ) {
    const authorizedContext = this.authorizeManagement(context);
    const saved = await this.repository.saveMarket(
      SaveMarketSchema.parse(input),
    );
    this.logManagementChange("market_saved", saved.code, authorizedContext);
    return saved;
  }

  private authorizeManagement(
    context: LocalizationManagementContext,
  ): LocalizationManagementContext {
    const parsed = {
      actor: SessionActorSchema.parse(context.actor),
      request_id: RequestIdSchema.parse(context.request_id),
    };
    if (
      parsed.actor.audience !== "staff" ||
      !parsed.actor.permissions.includes("localization:manage")
    ) {
      throw new ForbiddenException({
        code: "LOCALIZATION_FORBIDDEN",
        message: "缺少本地化配置管理权限",
        field_errors: [],
      });
    }
    return parsed;
  }

  private logManagementChange(
    event: string,
    entityCode: string,
    context: LocalizationManagementContext,
  ) {
    this.logger.log(
      JSON.stringify({
        event,
        entity_code: entityCode,
        actor_id: context.actor.user_id,
        request_id: context.request_id,
      }),
    );
  }

  private buildRuntimeSnapshot() {
    const markets = this.experienceState?.listMarkets().items ?? [];
    const locales = this.experienceState?.listLocales().items ?? [];
    const routes = this.experienceState?.listRoutes().items ?? [];

    return {
      markets,
      locales,
      routes,
    };
  }

  private async buildRepositorySnapshot() {
    const pagination = { page: 1, page_size: 100 };
    const markets = await this.repository.listPublicMarkets(pagination);
    return {
      markets: markets.items.map((market) => ({
        code: market.code,
        default_locale:
          market.locales.find((locale) => locale.is_default)?.locale ??
          market.locales[0]?.locale ??
          "en-US",
        currency: market.currency,
        timezone: market.timezone,
        fallback_locales: market.locales.map((locale) => locale.locale),
        status: market.status,
      })),
      locales: markets.items.flatMap((market) =>
        market.locales.map((locale) => ({
          code: locale.locale,
          name: locale.language.label,
          market: market.code,
          direction: "ltr",
          fallback_locale: locale.is_default
            ? null
            : market.locales.find((entry) => entry.is_default)?.locale ?? null,
          status: locale.language.status,
        })),
      ),
      routes: markets.items.flatMap((market) =>
        market.locales.map((locale) => ({
          market: market.code,
          locale: locale.locale,
          prefix: locale.is_default ? "/" : `/${locale.path_prefix}`,
          default: locale.is_default,
          fallback_chain: locale.is_default
            ? [locale.locale]
            : [
                locale.locale,
                market.locales.find((entry) => entry.is_default)?.locale ??
                  locale.locale,
              ],
        })),
      ),
    };
  }
}
