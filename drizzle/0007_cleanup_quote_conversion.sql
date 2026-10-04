-- Converted quotes already became models; remove the leftovers.
DELETE FROM "quotes" WHERE "status" = 'accepted' AND "converted_model_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_converted_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."quote_status";--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('open', 'rejected');--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."quote_status";--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DATA TYPE "public"."quote_status" USING "status"::"public"."quote_status";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "converted_model_id";