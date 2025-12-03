ALTER TABLE "tooth" DROP CONSTRAINT "tooth_color_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_color_color_id_fk";
--> statement-breakpoint
ALTER TABLE "tooth" DROP COLUMN "color";