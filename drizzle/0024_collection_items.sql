CREATE TYPE "public"."collection_condition" AS ENUM('new', 'damaged', 'very_damaged');--> statement-breakpoint
CREATE TABLE "collection_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"country" text,
	"manufacturer" text,
	"reference" text,
	"type" "model_type",
	"customized" boolean DEFAULT false NOT NULL,
	"purchase_price_cents" integer,
	"purchase_date" date,
	"estimated_value_cents" integer,
	"estimated_value_at" timestamp,
	"sold_price_cents" integer,
	"sold_date" date,
	"condition" "collection_condition" DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_country_iso" CHECK ("collection_items"."country" IS NULL OR "collection_items"."country" ~ '^[A-Z]{2}$'),
	CONSTRAINT "collection_items_prices_non_negative" CHECK (("collection_items"."purchase_price_cents" IS NULL OR "collection_items"."purchase_price_cents" >= 0) AND ("collection_items"."estimated_value_cents" IS NULL OR "collection_items"."estimated_value_cents" >= 0) AND ("collection_items"."sold_price_cents" IS NULL OR "collection_items"."sold_price_cents" >= 0)),
	CONSTRAINT "collection_items_sold_after_purchase" CHECK ("collection_items"."sold_date" IS NULL OR "collection_items"."purchase_date" IS NULL OR "collection_items"."sold_date" >= "collection_items"."purchase_date"),
	CONSTRAINT "collection_items_sold_price_needs_date" CHECK ("collection_items"."sold_price_cents" IS NULL OR "collection_items"."sold_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "collection_item_images" ADD CONSTRAINT "collection_item_images_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_item_images_item_idx" ON "collection_item_images" USING btree ("item_id","position");--> statement-breakpoint
CREATE INDEX "collection_items_user_idx" ON "collection_items" USING btree ("user_id");