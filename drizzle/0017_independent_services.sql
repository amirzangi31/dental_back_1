CREATE TYPE "public"."independent_service_type" AS ENUM('options', 'file');--> statement-breakpoint
CREATE TABLE "independent_service_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "independent_service_category_sort_idx" ON "independent_service_category" USING btree ("sort_order");--> statement-breakpoint
CREATE TABLE "independent_service" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" "independent_service_type" NOT NULL,
	"price" numeric(10, 2),
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "independent_service" ADD CONSTRAINT "independent_service_category_id_independent_service_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."independent_service_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "independent_service_category_id_idx" ON "independent_service" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "independent_service_sort_idx" ON "independent_service" USING btree ("sort_order");--> statement-breakpoint
CREATE TABLE "independent_service_option" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"file" text,
	"price" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "independent_service_option" ADD CONSTRAINT "independent_service_option_service_id_independent_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."independent_service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "independent_service_option_service_id_idx" ON "independent_service_option" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "independent_service_option_sort_idx" ON "independent_service_option" USING btree ("sort_order");--> statement-breakpoint
CREATE TABLE "order_independent_service" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"service_id" integer,
	"option_id" integer,
	"service_title" varchar(255) NOT NULL,
	"option_title" varchar(255),
	"price" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "order_independent_service" ADD CONSTRAINT "order_independent_service_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_independent_service" ADD CONSTRAINT "order_independent_service_service_id_independent_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."independent_service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_independent_service" ADD CONSTRAINT "order_independent_service_option_id_independent_service_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."independent_service_option"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_independent_service_order_id_idx" ON "order_independent_service" USING btree ("order_id");--> statement-breakpoint
CREATE TABLE "order_independent_service_file" (
	"item_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	CONSTRAINT "order_independent_service_file_item_id_file_id_pk" PRIMARY KEY("item_id","file_id")
);--> statement-breakpoint
ALTER TABLE "order_independent_service_file" ADD CONSTRAINT "order_independent_service_file_item_id_order_independent_service_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."order_independent_service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_independent_service_file" ADD CONSTRAINT "order_independent_service_file_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_independent_service_file_file_id_idx" ON "order_independent_service_file" USING btree ("file_id");
