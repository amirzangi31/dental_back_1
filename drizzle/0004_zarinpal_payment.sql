ALTER TYPE "public"."type" ADD VALUE 'zarinpal';--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "authority" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "refId" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "amount" integer;