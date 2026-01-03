CREATE TABLE "tax" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"percent" numeric(10, 2),
	"isDeleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
