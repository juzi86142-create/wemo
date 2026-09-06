-- CreateTable
CREATE TABLE "public"."form_submissions" (
    "id" SERIAL NOT NULL,
    "submission_no" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "assignee_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_submission_no_key" ON "public"."form_submissions"("submission_no");

-- CreateIndex
CREATE INDEX "form_submissions_type_status_idx" ON "public"."form_submissions"("type", "status");

-- CreateIndex
CREATE INDEX "form_submissions_assignee_id_idx" ON "public"."form_submissions"("assignee_id");
