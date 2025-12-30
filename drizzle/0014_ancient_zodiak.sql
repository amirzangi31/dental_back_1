CREATE TYPE "public"."descriptionstatus" AS ENUM('none', 'file', 'text', 'all');--> statement-breakpoint
CREATE TABLE "material" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"descriptionStatus" "descriptionstatus",
	"description" text,
	"file" text,
	"materialcategory" integer,
	"category" integer,
	"parent_id" integer DEFAULT null,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materialcategory" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_materialcategory_materialcategory_id_fk" FOREIGN KEY ("materialcategory") REFERENCES "public"."materialcategory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_parent_id_materialcategory_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."materialcategory"("id") ON DELETE no action ON UPDATE no action;