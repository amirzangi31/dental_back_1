ALTER TABLE "vip" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "vip" ADD COLUMN "end_time" time;--> statement-breakpoint
ALTER TABLE "vip" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "vip" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "vip" DROP COLUMN "startTime";--> statement-breakpoint
ALTER TABLE "vip" DROP COLUMN "endTime";--> statement-breakpoint
ALTER TABLE "vip" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "vip" DROP COLUMN "updatedAt";