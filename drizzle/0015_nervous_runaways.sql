CREATE TABLE "order_teeth" (
	"order_id" integer NOT NULL,
	"tooth_id" integer NOT NULL,
	CONSTRAINT "order_teeth_order_id_tooth_id_pk" PRIMARY KEY("order_id","tooth_id")
);
--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_category_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_device_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_materialshade_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_implant_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_implantattribute_unique";--> statement-breakpoint
ALTER TABLE "tooth" DROP CONSTRAINT "tooth_additionalscan_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_teeth_tooth_id_fk";
--> statement-breakpoint
ALTER TABLE "order_teeth" ADD CONSTRAINT "order_teeth_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_teeth" ADD CONSTRAINT "order_teeth_tooth_id_tooth_id_fk" FOREIGN KEY ("tooth_id") REFERENCES "public"."tooth"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "teeth";