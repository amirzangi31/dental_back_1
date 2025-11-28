import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const device = pgTable("device", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  file: text("file"),
  price: decimal("price", { precision: 10, scale: 2 }),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

