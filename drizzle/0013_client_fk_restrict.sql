ALTER TABLE "models" DROP CONSTRAINT "models_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;