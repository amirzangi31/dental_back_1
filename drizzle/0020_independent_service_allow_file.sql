ALTER TABLE "independent_service" ADD COLUMN "allow_file" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "independent_service_option" ADD COLUMN "allow_file" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "independent_service" SET "allow_file" = true WHERE "type" = 'file';
