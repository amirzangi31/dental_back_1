CREATE TYPE "public"."wallet_entry_kind" AS ENUM('topup', 'order');--> statement-breakpoint
CREATE TYPE "public"."wallet_entry_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
ALTER TYPE "public"."type" ADD VALUE 'wallet';--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance_toman" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_balance_non_negative" CHECK ("wallet"."balance_toman" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "wallet_entry_kind" NOT NULL,
	"status" "wallet_entry_status" NOT NULL,
	"amount_toman" integer NOT NULL,
	"authority" text,
	"ref_id" text,
	"order_id" integer,
	"payment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_user_id_unique" ON "wallet" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entry_authority_unique" ON "wallet_entry" USING btree ("authority");