ALTER TABLE "additionalscan" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "implant" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "implantattribute" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "additionalscan" CASCADE;--> statement-breakpoint
DROP TABLE "implant" CASCADE;--> statement-breakpoint
DROP TABLE "implantattribute" CASCADE;--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_implant_implant_id_fk";
--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_additionalscan_additionalscan_id_fk";
--> statement-breakpoint
ALTER TABLE "tooth" DROP COLUMN "implant";--> statement-breakpoint
ALTER TABLE "tooth" DROP COLUMN "additionalscan";