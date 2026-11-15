CREATE TYPE "public"."model_tag" AS ENUM('rigid', 'articulated', 'tipper', 'tanker', 'tractor_unit', 'lowboy', 'tautliner', 'refrigerated', 'flatbed', 'special', 'crane_mounted', 'lattice', 'telescopic', 'tower', 'all_terrain', 'carry_deck', 'rough_terrain', 'heavy_lift', 'tracked', 'wheeled', 'front_shovel', 'backhoe', 'mining', 'civil_works', 'site', 'forestry');--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'excavator';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'backhoe_loader';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'dumper';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'loader';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'bulldozer';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'paver';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'compactor';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'motor_grader';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'semi_trailer';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'trailer';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'cargo';--> statement-breakpoint
ALTER TYPE "public"."model_type" ADD VALUE 'attachment';--> statement-breakpoint
ALTER TABLE "collection_items" ADD COLUMN "tags" "model_tag"[] DEFAULT '{}'::model_tag[] NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "tags" "model_tag"[] DEFAULT '{}'::model_tag[] NOT NULL;