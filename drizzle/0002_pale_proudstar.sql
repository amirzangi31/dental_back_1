CREATE TYPE "public"."ticketStatus" AS ENUM('open', 'pending', 'close');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('uploadfile', 'check', 'design', 'approval', 'payment', 'finaldelivery');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "ticket_status" SET DATA TYPE "public"."ticketStatus" USING "ticket_status"::text::"public"."ticketStatus";