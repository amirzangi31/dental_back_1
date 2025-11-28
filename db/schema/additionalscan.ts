import {
  pgTable,
  serial,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { color } from "./color";

export const additionalscan = pgTable("additionalscan", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  color: integer("color").references(() => color.id),
  file: text("file"),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

