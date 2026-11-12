ALTER TABLE "users" ALTER COLUMN "postalcode" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "national_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "province" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tax_code" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "economic_code" varchar(20);