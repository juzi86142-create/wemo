-- Normalize experience and platform aggregates into first-class tables.
-- Logical integer references are intentionally left without physical foreign keys.
ALTER TABLE "public"."categories" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."categories" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."categories" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."variants" ADD COLUMN IF NOT EXISTS "primary_image_url" TEXT;
ALTER TABLE "public"."variants" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."variants" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."content_entries" ADD COLUMN IF NOT EXISTS "translation_status" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "public"."content_entries" ADD COLUMN IF NOT EXISTS "linked_product_ids" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."content_entries" ADD COLUMN IF NOT EXISTS "media_asset_ids" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."content_entries" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."media_assets" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."media_assets" ADD COLUMN IF NOT EXISTS "versions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."media_assets" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "internal_note" TEXT;
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "request_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."form_submissions" ADD COLUMN IF NOT EXISTS "history" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "public"."notification_deliveries" ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "public"."notification_deliveries" ADD COLUMN IF NOT EXISTS "request_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."notification_deliveries" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "public"."notification_deliveries" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "public"."notification_deliveries" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."analytics_events" ADD COLUMN IF NOT EXISTS "device" TEXT;
ALTER TABLE "public"."analytics_events" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "public"."analytics_events" ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_events_dedupe_key_key" ON "public"."analytics_events"("dedupe_key");
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "category" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_code_channel_locale_key" ON "public"."notification_templates"("code","channel","locale");
CREATE INDEX IF NOT EXISTS "notification_templates_audience_active_idx" ON "public"."notification_templates"("audience","active");
CREATE TABLE IF NOT EXISTS "public"."job_runs" (
  "id" SERIAL NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "actor_id" INTEGER,
  "company_id" INTEGER,
  "payload" JSONB NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "failure_reason" TEXT,
  "last_error" JSONB,
  "next_run_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "attempts_history" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_runs_idempotency_key_key" ON "public"."job_runs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "job_runs_status_created_at_idx" ON "public"."job_runs"("status","created_at");
CREATE INDEX IF NOT EXISTS "job_runs_kind_status_idx" ON "public"."job_runs"("kind","status");
CREATE TABLE IF NOT EXISTS "public"."integration_adapters" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "last_checked_at" TIMESTAMP(3),
  "last_error" TEXT,
  "capabilities" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "integration_adapters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "integration_adapters_code_key" ON "public"."integration_adapters"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_adapters_provider_kind_key" ON "public"."integration_adapters"("provider","kind");
CREATE INDEX IF NOT EXISTS "integration_adapters_status_kind_idx" ON "public"."integration_adapters"("status","kind");
CREATE TABLE IF NOT EXISTS "public"."webhook_deliveries" (
  "id" SERIAL NOT NULL,
  "integration_id" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "request_id" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "failure_reason" TEXT,
  "payload" JSONB NOT NULL,
  "response" JSONB,
  "signature" TEXT,
  "signature_version" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_deliveries_provider_idempotency_key_key" ON "public"."webhook_deliveries"("provider","idempotency_key");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_provider_status_created_at_idx" ON "public"."webhook_deliveries"("provider","status","created_at");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_request_id_idx" ON "public"."webhook_deliveries"("request_id");
ALTER TABLE "public"."outbox_events" ADD COLUMN IF NOT EXISTS "request_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."outbox_events" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."outbox_events" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
