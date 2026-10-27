CREATE TABLE "invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_id" integer NOT NULL,
	"issued_at" timestamp NOT NULL,
	"buyer_name" text,
	"buyer_phone" text,
	"buyer_address" text,
	"buyer_postal_code" text,
	"buyer_economic_number" text,
	"buyer_national_id" text,
	"buyer_city" text,
	"seller_name" text,
	"seller_economic_number" text,
	"seller_national_id" text,
	"seller_registration_number" text,
	"seller_postal_code" text,
	"seller_city" text,
	"seller_address" text,
	"seller_phone" text,
	"tax_number" text,
	"tax_percent" numeric(10, 2) NOT NULL,
	"paid_toman" integer NOT NULL,
	"total_rial" integer NOT NULL,
	"discount_rial" integer DEFAULT 0 NOT NULL,
	"toll_rial" integer DEFAULT 0 NOT NULL,
	"tax_rial" integer NOT NULL,
	"cash" boolean DEFAULT true NOT NULL,
	"tracking_code" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"product_code" text,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_amount_rial" integer NOT NULL,
	"line_total_rial" integer NOT NULL,
	"discount_rial" integer DEFAULT 0 NOT NULL,
	"amount_after_discount_rial" integer NOT NULL,
	"tax_rial" integer NOT NULL,
	"toll_rial" integer DEFAULT 0 NOT NULL,
	"tax_and_toll_rial" integer NOT NULL,
	"total_with_tax_rial" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_order_id_unique" ON "invoice" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_payment_id_unique" ON "invoice" USING btree ("payment_id");