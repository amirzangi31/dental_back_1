ALTER TABLE "orders" ADD COLUMN "isDelivered" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryDate" timestamp;