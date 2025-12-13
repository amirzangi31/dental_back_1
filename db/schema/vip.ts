import {
    pgTable,
    serial,
    decimal,
    text,
    timestamp,
  } from "drizzle-orm/pg-core";

export const vip = pgTable("vip", {
  id: serial("id").primaryKey(),
  price: decimal("price", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
