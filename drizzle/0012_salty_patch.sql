CREATE TYPE "public"."discount_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "discount_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" varchar(255),
	"kind" "discount_kind" NOT NULL,
	"value" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "buyer_tax_code" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "discount_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_code" varchar(64);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_toman" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "discount_code_code_unique" ON "discount_code" USING btree ("code");