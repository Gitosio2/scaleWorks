CREATE TYPE "public"."model_type" AS ENUM('truck', 'crane', 'machine');--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "type" "model_type";