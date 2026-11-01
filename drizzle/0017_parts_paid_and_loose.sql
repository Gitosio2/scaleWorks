ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "expenses" CASCADE;--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "parts_one_owner";--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_at_most_one_owner" CHECK (NOT ("parts"."model_id" IS NOT NULL AND "parts"."quote_id" IS NOT NULL));--> statement-breakpoint
DROP TYPE "public"."expense_status";