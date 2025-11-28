ALTER TABLE "additionalscan" ADD COLUMN "file" text;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "file" text;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD COLUMN "file" text;--> statement-breakpoint
ALTER TABLE "additionalscan" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "device" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "implant" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "implantattribute" DROP COLUMN "icon";