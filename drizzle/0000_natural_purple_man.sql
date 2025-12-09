CREATE TYPE "public"."materialshadecategory" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('open', 'pending', 'close');--> statement-breakpoint
CREATE TYPE "public"."patientgender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('doctor', 'admin', 'labrator');--> statement-breakpoint
CREATE TABLE "additionalscan" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"file" text,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"file" text,
	"color" integer,
	"price" numeric(10, 2),
	"catalog" integer,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorycolor" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"code" varchar(255),
	"category" integer,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"file" text,
	"price" numeric(10, 2),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"originalname" varchar(255) NOT NULL,
	"mimetype" varchar(100),
	"size" bigint,
	"path" text NOT NULL,
	"user_id" integer,
	"isDeleted" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "implant" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"file" text,
	"parent_id" integer DEFAULT null,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "implantattribute" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"color" integer,
	"file" text,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materialshade" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"price" numeric(10, 2),
	"category" "materialshadecategory",
	"color" integer,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_teeth" (
	"order_id" integer NOT NULL,
	"tooth_id" integer NOT NULL,
	CONSTRAINT "order_teeth_order_id_tooth_id_pk" PRIMARY KEY("order_id","tooth_id")
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
	"totalaprice" numeric(10, 2) DEFAULT '0.00',
	"paymentstatus" boolean DEFAULT false,
	"comment" text,
	"file" text,
	"adminFile" text,
	"discount" integer,
	"vip" boolean DEFAULT false,
	"isDelivered" boolean DEFAULT false,
	"deliveryDate" timestamp,
	"connections" integer[],
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_type" varchar(10) NOT NULL,
	"message" varchar(2000),
	"file" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" "status",
	"subject" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tooth" (
	"id" serial PRIMARY KEY NOT NULL,
	"toothnumber" integer,
	"category" integer,
	"device" integer,
	"materialshade" integer,
	"implant" integer,
	"additionalscan" integer,
	"volume" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"postalcode" varchar(100) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"isDeleted" integer DEFAULT 1 NOT NULL,
	"role" "role" DEFAULT 'doctor' NOT NULL,
	"specaility" varchar(100),
	"laboratoryName" varchar(100),
	"phoneNumber" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "vip" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" numeric(10, 2),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "volume" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"defaultvalue" numeric(10, 2),
	"start" numeric(10, 2),
	"end" numeric(10, 2),
	"price" numeric(10, 2),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "additionalscan" ADD CONSTRAINT "additionalscan_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_catalog_catalog_id_fk" FOREIGN KEY ("catalog") REFERENCES "public"."catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color" ADD CONSTRAINT "color_category_categorycolor_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categorycolor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implant" ADD CONSTRAINT "implant_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implant" ADD CONSTRAINT "implant_parent_id_implant_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."implant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD CONSTRAINT "implantattribute_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materialshade" ADD CONSTRAINT "materialshade_color_color_id_fk" FOREIGN KEY ("color") REFERENCES "public"."color"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_teeth" ADD CONSTRAINT "order_teeth_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_teeth" ADD CONSTRAINT "order_teeth_tooth_id_tooth_id_fk" FOREIGN KEY ("tooth_id") REFERENCES "public"."tooth"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_device_device_id_fk" FOREIGN KEY ("device") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_materialshade_materialshade_id_fk" FOREIGN KEY ("materialshade") REFERENCES "public"."materialshade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_implant_implant_id_fk" FOREIGN KEY ("implant") REFERENCES "public"."implant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth" ADD CONSTRAINT "tooth_additionalscan_additionalscan_id_fk" FOREIGN KEY ("additionalscan") REFERENCES "public"."additionalscan"("id") ON DELETE no action ON UPDATE no action;