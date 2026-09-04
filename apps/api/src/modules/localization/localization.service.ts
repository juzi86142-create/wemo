import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import {
  LanguageListResponseSchema,
  MarketContextSchema,
  MarketListResponseSchema,
  PaginationSchema,
  RequestIdSchema,
  ResolveMarketContextQuerySchema,
  SaveMarketSchema,
  SessionActorSchema,
  UpsertLanguageSchema,
  type Pagination,
  type SaveMarketInput,
  type SessionActor,
  type UpsertLanguageInput,
} from "@wemo/contracts";

import { ApiHttpException } from "../../http/api-http.exception";
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
  ) {}

  async listLanguages(input: Pagination) {
    const pagination = PaginationSchema.parse(input);
    const result = await this.repository.listPublicLanguages(pagination);
    return LanguageListResponseSchema.parse({ ...pagination, ...result });
  }

  async listMarkets(input: Pagination) {
    const pagination = PaginationSchema.parse(input);
    const result = await this.repository.listPublicMarkets(pagination);
    return MarketListResponseSchema.parse({ ...pagination, ...result });
  }

  async resolveMarketContext(input: { market: string; locale: string }) {
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
}
