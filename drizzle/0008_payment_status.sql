CREATE TYPE "public"."payment_status" AS ENUM('none', 'deposit_paid', 'paid');--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "payment_status" "payment_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "deposit_cents" integer;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_deposit_consistent" CHECK (("models"."payment_status" = 'deposit_paid' AND "models"."deposit_cents" IS NOT NULL AND "models"."deposit_cents" > 0) OR ("models"."payment_status" <> 'deposit_paid' AND "models"."deposit_cents" IS NULL));