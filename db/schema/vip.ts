import {
    pgTable,
    serial,
    decimal,
    text,
  } from "drizzle-orm/pg-core";

export const vip = pgTable("vip", {
  id: serial("id").primaryKey(),
  price: decimal("price", { precision: 10, scale: 2 }),
  description: text("description"),
});
