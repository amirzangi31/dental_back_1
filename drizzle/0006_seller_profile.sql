CREATE TABLE "seller_profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"singleton_key" integer DEFAULT 1 NOT NULL,
	"name" text,
	"economic_number" text,
	"national_id" text,
	"registration_number" text,
	"postal_code" text,
	"city" text,
	"address" text,
	"phone" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seller_profile_singleton" ON "seller_profile" USING btree ("singleton_key");