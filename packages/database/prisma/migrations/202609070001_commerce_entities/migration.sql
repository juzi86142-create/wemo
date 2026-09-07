-- Persist commerce aggregates in their normalized PostgreSQL entities.
-- All IDs are logical integer references; this migration intentionally adds
-- no physical foreign-key constraints.

ALTER TABLE "public"."prices"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."inventory_reservations"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "public"."inventory_reservations"
  SET "idempotency_key" = CONCAT('legacy-reservation-', "id")
  WHERE "idempotency_key" IS NULL;
ALTER TABLE "public"."inventory_reservations"
  ALTER COLUMN "idempotency_key" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservations_idempotency_key_key"
  ON "public"."inventory_reservations"("idempotency_key");

ALTER TABLE "public"."carts"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."cart_items"
  ADD COLUMN IF NOT EXISTS "unit_price_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "snapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "status_history" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "request_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_request_id_key"
  ON "public"."orders"("request_id");

ALTER TABLE "public"."order_items"
  ADD COLUMN IF NOT EXISTS "shipping_minor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."quotes"
  ADD COLUMN IF NOT EXISTS "requested_by_user_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "terms_snapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "items" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "request_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "public"."quotes" SET "valid_until" = CURRENT_TIMESTAMP WHERE "valid_until" IS NULL;
ALTER TABLE "public"."quotes" ALTER COLUMN "valid_until" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."quotes" ALTER COLUMN "valid_until" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_request_id_key"
  ON "public"."quotes"("request_id");

ALTER TABLE "public"."payments"
  ADD COLUMN IF NOT EXISTS "refunded_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payload" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "public"."return_requests"
  ADD COLUMN IF NOT EXISTS "history" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "request_id" TEXT,
  ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "return_requests_request_id_key"
  ON "public"."return_requests"("request_id");
