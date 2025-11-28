CREATE TYPE "public"."materialshadecategory" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('uploadfile', 'check', 'design', 'approval', 'payment', 'finaldelivery');--> statement-breakpoint
CREATE TYPE "public"."patientgender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "additionalscan" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"file" text,
	"price" numeric(10, 2),
	"catalog" integer,
	"icon" text,
	CONSTRAINT "category_catalog_unique" UNIQUE("catalog")
);
--> statement-breakpoint
CREATE TABLE "categorycolor" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "color" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"code" varchar(255),
	"category" integer
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"file" text,
	"price" numeric(10, 2),
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "implant" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "implantattribute" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "materialshade" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"category" "materialshadecategory",
	"color" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"user_id" integer NOT NULL,
	"patientname" varchar(255),
	"patientage" integer,
	"patientgender" "patientgender",
	"report" integer,
	"status" "status",
	"totalaprice" numeric(10, 2),
	"paymentstatus" boolean DEFAULT false,
	"comment" text,
	"file" text,
	"discount" integer,
	"vip" boolean DEFAULT false,
	"teeth" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer
);
--> statement-breakpoint
CREATE TABLE "tooth" (
	"id" serial PRIMARY KEY NOT NULL,
	"toothnumber" integer,
	"category" integer,
	"device" integer,
	"materialshade" integer,
	"implant" integer,
	"implantattribute" integer,
	"additionalscan" integer,
	"volume" integer,
	"connection" integer,
	CONSTRAINT "tooth_category_unique" UNIQUE("category"),
	CONSTRAINT "tooth_device_unique" UNIQUE("device"),
	CONSTRAINT "tooth_materialshade_unique" UNIQUE("materialshade"),
	CONSTRAINT "tooth_implant_unique" UNIQUE("implant"),
	CONSTRAINT "tooth_implantattribute_unique" UNIQUE("implantattribute"),
	CONSTRAINT "tooth_additionalscan_unique" UNIQUE("additionalscan"),
	CONSTRAINT "tooth_volume_unique" UNIQUE("volume"),
	CONSTRAINT "tooth_connection_unique" UNIQUE("connection")
);
--> statement-breakpoint
CREATE TABLE "volume" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"start" numeric(10, 2),
	"end" numeric(10, 2),
	"price" numeric(10, 2)
);
--> statement-breakpoint
ALTER TABLE "additionalscan" ADD CONSTRAINT "additionalscan_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_catalog_catalog_id_fk" FOREIGN KEY ("catalog") REFERENCES "public"."catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color" ADD CONSTRAINT "color_category_categorycolor_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categorycolor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implant" ADD CONSTRAINT "implant_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD CONSTRAINT "implantattribute_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materialshade" ADD CONSTRAINT "materialshade_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_teeth_tooth_id_fk" FOREIGN KEY ("teeth") REFERENCES "public"."tooth"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_device_device_id_fk" FOREIGN KEY ("device") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_materialshade_materialshade_id_fk" FOREIGN KEY ("materialshade") REFERENCES "public"."materialshade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_implant_implant_id_fk" FOREIGN KEY ("implant") REFERENCES "public"."implant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_implantattribute_implantattribute_id_fk" FOREIGN KEY ("implantattribute") REFERENCES "public"."implantattribute"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_additionalscan_additionalscan_id_fk" FOREIGN KEY ("additionalscan") REFERENCES "public"."additionalscan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_volume_volume_id_fk" FOREIGN KEY ("volume") REFERENCES "public"."volume"("id") ON DELETE no action ON UPDATE no action;