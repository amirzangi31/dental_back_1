CREATE TYPE "public"."paymentStatus" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('uploadfile', 'check', 'design', 'approval', 'payment', 'finaldelivery');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "status" SET DATA TYPE "public"."paymentStatus" USING "status"::text::"public"."paymentStatus";--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "isAccepted" boolean DEFAULT false;