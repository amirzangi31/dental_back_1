ALTER TYPE "public"."wallet_entry_kind" ADD VALUE 'admin';--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD COLUMN "actor_user_id" integer;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
