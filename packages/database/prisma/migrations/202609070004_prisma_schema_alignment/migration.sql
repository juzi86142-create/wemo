-- Align database defaults with the Prisma schema after backfilling legacy rows.
-- Prisma supplies @updatedAt values, so those columns must not keep database defaults.

ALTER TABLE "public"."sessions"
  ALTER COLUMN "last_seen_at" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "public"."form_submissions"
SET "request_id" = CONCAT('legacy-form-submission-', "id")
WHERE "request_id" IS NULL OR "request_id" = '';

UPDATE "public"."notification_deliveries"
SET "request_id" = CONCAT('legacy-notification-delivery-', "id")
WHERE "request_id" IS NULL OR "request_id" = '';

ALTER TABLE "public"."form_submissions"
  ALTER COLUMN "request_id" SET NOT NULL;
ALTER TABLE "public"."notification_deliveries"
  ALTER COLUMN "request_id" SET NOT NULL;

ALTER TABLE "public"."categories"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."products"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."variants"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."prices"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."inventory_reservations"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."cart_items"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."quotes"
  ALTER COLUMN "valid_until" DROP DEFAULT,
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."media_assets"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."form_submissions"
  ALTER COLUMN "request_id" DROP DEFAULT;
ALTER TABLE "public"."notification_deliveries"
  ALTER COLUMN "request_id" DROP DEFAULT,
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."notification_templates"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."job_runs"
  ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "public"."webhook_deliveries"
  ALTER COLUMN "updated_at" DROP DEFAULT;
-- The remaining updated_at columns existed in the initial schema and are
-- already default-free; listing them is unnecessary and would obscure the
-- actual compatibility changes above.
