-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '[]';
