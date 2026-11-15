ALTER TABLE "collection_items" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "models" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
-- The removed "machine" type becomes "no type" instead of failing the cast back to the enum.
UPDATE "collection_items" SET "type" = NULL WHERE "type" = 'machine';--> statement-breakpoint
UPDATE "models" SET "type" = NULL WHERE "type" = 'machine';--> statement-breakpoint
DROP TYPE "public"."model_type";--> statement-breakpoint
CREATE TYPE "public"."model_type" AS ENUM('truck', 'crane', 'excavator', 'backhoe_loader', 'dumper', 'loader', 'bulldozer', 'paver', 'compactor', 'motor_grader', 'semi_trailer', 'trailer', 'cargo', 'attachment');--> statement-breakpoint
ALTER TABLE "collection_items" ALTER COLUMN "type" SET DATA TYPE "public"."model_type" USING "type"::"public"."model_type";--> statement-breakpoint
ALTER TABLE "models" ALTER COLUMN "type" SET DATA TYPE "public"."model_type" USING "type"::"public"."model_type";