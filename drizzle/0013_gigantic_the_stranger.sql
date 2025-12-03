ALTER TABLE "tooth" ADD COLUMN "color" integer;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_color_unique" UNIQUE("color");