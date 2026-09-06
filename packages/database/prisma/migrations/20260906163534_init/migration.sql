-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "audience" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "overrides" JSONB NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "audience" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dealer_companies" (
    "id" SERIAL NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "tier_id" INTEGER,
    "price_list_id" INTEGER,
    "currency" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "public_listing" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "dealer_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dealer_members" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "dealer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dealer_applications" (
    "id" SERIAL NOT NULL,
    "application_no" TEXT NOT NULL,
    "applicant_user_id" INTEGER,
    "legal_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."languages" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "native_label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."markets" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "default_locale" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."market_locales" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "path_prefix" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "market_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "localized_content" JSONB NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" SERIAL NOT NULL,
    "primary_category_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "age_min" INTEGER,
    "age_max" INTEGER,
    "attributes" JSONB NOT NULL,
    "market_visibility" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_translations" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "translation_status" TEXT NOT NULL DEFAULT 'not_started',

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "options" JSONB NOT NULL,
    "specifications" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prices" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "price_list_id" INTEGER,
    "dealer_tier_id" INTEGER,
    "dealer_company_id" INTEGER,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price_type" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "rules" JSONB NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_lists" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_balances" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "warehouse_code" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "synced_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" SERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "request_id" TEXT,
    "channel" TEXT NOT NULL,
    "user_id" INTEGER,
    "company_id" INTEGER,
    "currency" TEXT NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "tax_minor" INTEGER NOT NULL,
    "shipping_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "pricing_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "sku_snapshot" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "tax_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "detail_snapshot" JSONB NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" SERIAL NOT NULL,
    "quote_no" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "valid_until" TIMESTAMP(3),
    "converted_order_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_versions" (
    "id" SERIAL NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_txn_id" TEXT,
    "status" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "failure_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "carrier" TEXT,
    "tracking_no" TEXT,
    "status" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "shipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_entries" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_assets" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "alt" TEXT,
    "visibility" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1',
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" SERIAL NOT NULL,
    "group_name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "request_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."redirects" (
    "id" SERIAL NOT NULL,
    "source_path" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "public"."roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "public"."user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "public"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "public"."sessions"("expires_at");

-- CreateIndex
CREATE INDEX "dealer_companies_status_country_idx" ON "public"."dealer_companies"("status", "country");

-- CreateIndex
CREATE INDEX "dealer_companies_tier_id_idx" ON "public"."dealer_companies"("tier_id");

-- CreateIndex
CREATE INDEX "dealer_companies_price_list_id_idx" ON "public"."dealer_companies"("price_list_id");

-- CreateIndex
CREATE INDEX "dealer_members_company_id_idx" ON "public"."dealer_members"("company_id");

-- CreateIndex
CREATE INDEX "dealer_members_user_id_idx" ON "public"."dealer_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_members_company_id_user_id_key" ON "public"."dealer_members"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_applications_application_no_key" ON "public"."dealer_applications"("application_no");

-- CreateIndex
CREATE INDEX "dealer_applications_status_country_idx" ON "public"."dealer_applications"("status", "country");

-- CreateIndex
CREATE INDEX "dealer_applications_applicant_user_id_idx" ON "public"."dealer_applications"("applicant_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "public"."languages"("code");

-- CreateIndex
CREATE INDEX "languages_status_idx" ON "public"."languages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "markets_code_key" ON "public"."markets"("code");

-- CreateIndex
CREATE INDEX "market_locales_market_id_status_sort_order_idx" ON "public"."market_locales"("market_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "market_locales_language_id_idx" ON "public"."market_locales"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_locales_market_id_locale_key" ON "public"."market_locales"("market_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "market_locales_market_id_path_prefix_key" ON "public"."market_locales"("market_id", "path_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "public"."categories"("parent_id");

-- CreateIndex
CREATE INDEX "products_status_primary_category_id_idx" ON "public"."products"("status", "primary_category_id");

-- CreateIndex
CREATE INDEX "product_translations_product_id_idx" ON "public"."product_translations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_market_locale_slug_key" ON "public"."product_translations"("market", "locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "variants_sku_key" ON "public"."variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "variants_barcode_key" ON "public"."variants"("barcode");

-- CreateIndex
CREATE INDEX "variants_product_id_idx" ON "public"."variants"("product_id");

-- CreateIndex
CREATE INDEX "prices_variant_id_market_currency_idx" ON "public"."prices"("variant_id", "market", "currency");

-- CreateIndex
CREATE INDEX "prices_price_list_id_idx" ON "public"."prices"("price_list_id");

-- CreateIndex
CREATE INDEX "prices_dealer_company_id_idx" ON "public"."prices"("dealer_company_id");

-- CreateIndex
CREATE INDEX "prices_dealer_tier_id_idx" ON "public"."prices"("dealer_tier_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_code_key" ON "public"."price_lists"("code");

-- CreateIndex
CREATE INDEX "inventory_balances_variant_id_idx" ON "public"."inventory_balances"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_variant_id_warehouse_code_market_key" ON "public"."inventory_balances"("variant_id", "warehouse_code", "market");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "public"."orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "public"."orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_company_id_created_at_idx" ON "public"."orders"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "public"."orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "public"."order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "public"."order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_no_key" ON "public"."quotes"("quote_no");

-- CreateIndex
CREATE INDEX "quotes_company_id_status_idx" ON "public"."quotes"("company_id", "status");

-- CreateIndex
CREATE INDEX "quotes_converted_order_id_idx" ON "public"."quotes"("converted_order_id");

-- CreateIndex
CREATE INDEX "quote_versions_created_by_idx" ON "public"."quote_versions"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quote_id_version_key" ON "public"."quote_versions"("quote_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "public"."payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "public"."payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_provider_txn_id_idx" ON "public"."payments"("provider_txn_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "public"."shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_tracking_no_idx" ON "public"."shipments"("tracking_no");

-- CreateIndex
CREATE INDEX "content_entries_type_status_idx" ON "public"."content_entries"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_entries_market_locale_slug_key" ON "public"."content_entries"("market", "locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_file_key_key" ON "public"."media_assets"("file_key");

-- CreateIndex
CREATE INDEX "media_assets_checksum_idx" ON "public"."media_assets"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_group_name_key_key" ON "public"."system_settings"("group_name", "key");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_created_at_idx" ON "public"."audit_logs"("entity", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "public"."audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_source_path_key" ON "public"."redirects"("source_path");
