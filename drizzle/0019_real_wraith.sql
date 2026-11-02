CREATE TABLE "stock_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"brand" text,
	"reference" text,
	"description" text NOT NULL,
	"store" text,
	"url" text,
	"price_cents" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_components_quantity_non_negative" CHECK ("stock_components"."quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX "stock_components_user_idx" ON "stock_components" USING btree ("user_id");