ALTER TABLE "orders" ALTER COLUMN "totalaprice" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refrence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refrence_orders_id_fk" FOREIGN KEY ("refrence") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;