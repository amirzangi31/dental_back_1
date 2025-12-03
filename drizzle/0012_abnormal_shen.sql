ALTER TABLE "tooth" DROP CONSTRAINT "tooth_volume_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_volume_volume_id_fk";
--> statement-breakpoint
ALTER TABLE "tooth" ALTER COLUMN "volume" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tooth" ALTER COLUMN "volume" SET NOT NULL;