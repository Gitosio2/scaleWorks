CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"carrier" text,
	"tracking_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumables" ADD COLUMN "delivery_id" uuid;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "delivery_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_components" ADD COLUMN "status" "supply_status" DEFAULT 'in_hand' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_components" ADD COLUMN "delivery_id" uuid;--> statement-breakpoint
CREATE INDEX "deliveries_user_idx" ON "deliveries" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_components" ADD CONSTRAINT "stock_components_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE set null ON UPDATE no action;