import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { RedisModule } from "./database/redis.module";
import { HealthModule } from "./health/health.module";
import { ApiHttpModule } from "./http/api-http.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CartModule } from "./modules/cart/cart.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CmsModule } from "./modules/cms/cms.module";
import { DealersModule } from "./modules/dealers/dealers.module";
import { FormsModule } from "./modules/forms/forms.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { LocalizationModule } from "./modules/localization/localization.module";
import { MediaModule } from "./modules/media/media.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ReturnsModule } from "./modules/returns/returns.module";
import { SearchModule } from "./modules/search/search.module";
import { SeoModule } from "./modules/seo/seo.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { RuntimeModule } from "./runtime/runtime.module";

/** 全局默认限流 每 IP 每分钟 100 次 登录/表单/搜索等敏感路由按需收紧 */
const GLOBAL_THROTTLE_LIMIT = 100;
const GLOBAL_THROTTLE_TTL_MS = 60_000;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: GLOBAL_THROTTLE_TTL_MS, limit: GLOBAL_THROTTLE_LIMIT },
      ],
    }),
    RedisModule,
    ApiHttpModule,
    HealthModule,
    AuthModule,
    IdentityModule,
    CatalogModule,
    PricingModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReturnsModule,
    DealersModule,
    QuotesModule,
    ReportsModule,
    CmsModule,
    MediaModule,
    FormsModule,
    SearchModule,
    SeoModule,
    LocalizationModule,
    NotificationsModule,
    AnalyticsModule,
    IntegrationsModule,
    JobsModule,
    RuntimeModule,
    AuditModule,
    SettingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
