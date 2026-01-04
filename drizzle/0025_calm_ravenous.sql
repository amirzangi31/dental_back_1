ALTER TABLE "orders" ALTER COLUMN "totalaprice" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "userfiles" text;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "isDelivered";