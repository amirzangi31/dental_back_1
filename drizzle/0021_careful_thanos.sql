ALTER TABLE "volume" ADD COLUMN "unit" varchar(100);--> statement-breakpoint
ALTER TABLE "materialshade" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "volume" DROP COLUMN "price";