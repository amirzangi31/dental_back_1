CREATE TYPE "public"."role" AS ENUM('doctor', 'admin', 'labrator');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastName" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "postalcode" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "isDeleted" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'doctor' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specaility" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "laboratoryName" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phoneNumber" varchar(100);