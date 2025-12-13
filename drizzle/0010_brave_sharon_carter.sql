ALTER TABLE "vip" ADD COLUMN "createdAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "vip" ADD COLUMN "updatedAt" timestamp DEFAULT now();