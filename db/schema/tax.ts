import {
    pgTable,
    serial,
    varchar,
    decimal,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const tax: any = pgTable("tax", {
    id: serial("id").primaryKey(),
    title : varchar("title", {length : 255}),
    percent: decimal("percent", { precision: 10, scale: 2 }),
    isDeleted: integer("isDeleted").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  });
  