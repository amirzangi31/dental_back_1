CREATE TABLE "vip" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" numeric(10, 2),
	"description" text
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "totalaprice" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "adminFile" text;