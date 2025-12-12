CREATE TYPE "public"."type" AS ENUM('uploadfile', 'paypal');--> statement-breakpoint
ALTER TYPE "public"."materialshadecategory" ADD VALUE 'M';--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"status" "status",
	"file" text,
	"type" "type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";--> statement-breakpoint
ALTER TABLE "additionalscan" ADD COLUMN "parent_id" integer DEFAULT null;--> statement-breakpoint
ALTER TABLE "additionalscan" ADD COLUMN "category" integer;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "category" integer;--> statement-breakpoint
ALTER TABLE "volume" ADD COLUMN "category" integer;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additionalscan" ADD CONSTRAINT "additionalscan_parent_id_additionalscan_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."additionalscan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additionalscan" ADD CONSTRAINT "additionalscan_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implant" ADD CONSTRAINT "implant_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volume" ADD CONSTRAINT "volume_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;