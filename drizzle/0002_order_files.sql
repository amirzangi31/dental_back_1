CREATE TYPE "public"."order_file_role" AS ENUM('user', 'admin', 'designer');--> statement-breakpoint
CREATE TABLE "order_files" (
	"order_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"role" "order_file_role" DEFAULT 'user',
	CONSTRAINT "order_files_order_id_file_id_pk" PRIMARY KEY("order_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;