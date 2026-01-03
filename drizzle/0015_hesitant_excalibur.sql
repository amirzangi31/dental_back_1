ALTER TABLE "material" DROP CONSTRAINT "material_parent_id_materialcategory_id_fk";
--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_parent_id_material_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."material"("id") ON DELETE no action ON UPDATE no action;