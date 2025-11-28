ALTER TABLE "additionalscan" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "additionalscan" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "additionalscan" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categorycolor" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categorycolor" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categorycolor" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "color" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "color" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "color" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "parent_id" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "implant" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "implantattribute" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "materialshade" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "materialshade" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "materialshade" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volume" ADD COLUMN "isDeleted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "volume" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volume" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "implant" ADD CONSTRAINT "implant_parent_id_implant_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."implant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "updated_at";