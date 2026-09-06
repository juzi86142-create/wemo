-- CreateTable
CREATE TABLE "public"."return_requests" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "company_id" INTEGER,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "attachments" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_requests_order_id_idx" ON "public"."return_requests"("order_id");

-- CreateIndex
CREATE INDEX "return_requests_user_id_status_idx" ON "public"."return_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "return_requests_company_id_status_idx" ON "public"."return_requests"("company_id", "status");
