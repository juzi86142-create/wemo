-- Align identity and dealer entities with the API contracts.
-- Relationships remain logical IDs; this migration intentionally adds no FKs.

ALTER TABLE "public"."sessions"
  ADD COLUMN IF NOT EXISTS "token" TEXT,
  ADD COLUMN IF NOT EXISTS "company_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);

UPDATE "public"."sessions"
SET "token" = md5(random()::text || clock_timestamp()::text)
WHERE "token" IS NULL;
UPDATE "public"."sessions"
SET "last_seen_at" = "created_at"
WHERE "last_seen_at" IS NULL;
ALTER TABLE "public"."sessions"
  ALTER COLUMN "token" SET NOT NULL,
  ALTER COLUMN "last_seen_at" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key"
  ON "public"."sessions"("token");

ALTER TABLE "public"."dealer_applications"
  ADD COLUMN IF NOT EXISTS "company_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "business_type" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "review_note" TEXT;
UPDATE "public"."dealer_applications"
SET
  "display_name" = COALESCE("display_name", "legal_name"),
  "business_type" = COALESCE("business_type", 'distributor'),
  "contact_name" = COALESCE("contact_name", "contact_email"),
  "currency" = COALESCE("currency", 'USD');
ALTER TABLE "public"."dealer_applications"
  ALTER COLUMN "display_name" SET NOT NULL,
  ALTER COLUMN "business_type" SET NOT NULL,
  ALTER COLUMN "contact_name" SET NOT NULL,
  ALTER COLUMN "currency" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "dealer_applications_company_id_idx"
  ON "public"."dealer_applications"("company_id");

ALTER TABLE "public"."dealer_companies"
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "business_type" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_terms" TEXT,
  ADD COLUMN IF NOT EXISTS "sales_territories" JSONB,
  ADD COLUMN IF NOT EXISTS "authorized_categories" JSONB,
  ADD COLUMN IF NOT EXISTS "sales_rep" TEXT,
  ADD COLUMN IF NOT EXISTS "public_listing" BOOLEAN;
UPDATE "public"."dealer_companies"
SET
  "business_type" = COALESCE("business_type", 'distributor'),
  "payment_terms" = COALESCE("payment_terms", COALESCE("terms"->>'payment_terms', 'Net 30')),
  "sales_territories" = COALESCE("sales_territories", COALESCE("terms"->'sales_territories', '{}'::jsonb)),
  "authorized_categories" = COALESCE("authorized_categories", COALESCE("terms"->'authorized_categories', '{}'::jsonb)),
  "public_listing" = COALESCE("public_listing", TRUE);
ALTER TABLE "public"."dealer_companies"
  ALTER COLUMN "business_type" SET NOT NULL,
  ALTER COLUMN "payment_terms" SET NOT NULL,
  ALTER COLUMN "sales_territories" SET NOT NULL,
  ALTER COLUMN "authorized_categories" SET NOT NULL,
  ALTER COLUMN "public_listing" SET NOT NULL,
  ALTER COLUMN "terms" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "business_type" SET DEFAULT 'distributor',
  ALTER COLUMN "payment_terms" SET DEFAULT 'Net 30',
  ALTER COLUMN "sales_territories" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "authorized_categories" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "public_listing" SET DEFAULT TRUE;

ALTER TABLE "public"."dealer_members"
  ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "joined_at" TIMESTAMP(3);
UPDATE "public"."dealer_members"
SET "joined_at" = COALESCE("joined_at", CURRENT_TIMESTAMP);
ALTER TABLE "public"."dealer_members"
  ALTER COLUMN "joined_at" SET NOT NULL,
  ALTER COLUMN "joined_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."dealer_addresses"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3);
UPDATE "public"."dealer_addresses"
SET "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP);
ALTER TABLE "public"."dealer_addresses"
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "public"."data_requests" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "request_id" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "data_requests_user_id_status_idx"
  ON "public"."data_requests"("user_id", "status");
CREATE INDEX IF NOT EXISTS "data_requests_request_id_idx"
  ON "public"."data_requests"("request_id");

CREATE TABLE IF NOT EXISTS "public"."identity_notifications" (
  "id" SERIAL NOT NULL,
  "recipient_user_id" INTEGER,
  "company_id" INTEGER,
  "audience" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "template_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "request_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  CONSTRAINT "identity_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "identity_notifications_recipient_user_id_status_idx"
  ON "public"."identity_notifications"("recipient_user_id", "status");
CREATE INDEX IF NOT EXISTS "identity_notifications_company_id_status_idx"
  ON "public"."identity_notifications"("company_id", "status");
CREATE INDEX IF NOT EXISTS "identity_notifications_audience_status_idx"
  ON "public"."identity_notifications"("audience", "status");
CREATE INDEX IF NOT EXISTS "identity_notifications_request_id_idx"
  ON "public"."identity_notifications"("request_id");
