CREATE TABLE "ticket_read" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer
);
--> statement-breakpoint
ALTER TABLE "material" ADD COLUMN "inputRequired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_read" ADD CONSTRAINT "ticket_read_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_read" ADD CONSTRAINT "ticket_read_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;