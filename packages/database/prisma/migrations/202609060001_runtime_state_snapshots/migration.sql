-- Durable aggregate snapshot storage for API repositories.
CREATE TABLE "public"."runtime_states" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "state_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "runtime_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "runtime_states_entity_state_key_key"
  ON "public"."runtime_states"("entity", "state_key");
CREATE INDEX "runtime_states_entity_idx" ON "public"."runtime_states"("entity");
