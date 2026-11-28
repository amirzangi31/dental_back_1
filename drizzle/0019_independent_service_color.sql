ALTER TABLE "independent_service" ADD COLUMN "color" integer;--> statement-breakpoint
ALTER TABLE "independent_service" ADD CONSTRAINT "independent_service_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "independent_service_option" ADD COLUMN "color" integer;--> statement-breakpoint
ALTER TABLE "independent_service_option" ADD CONSTRAINT "independent_service_option_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;
