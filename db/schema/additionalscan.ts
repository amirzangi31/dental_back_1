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
import { category } from "./category";

export const additionalscan: any = pgTable("additionalscan", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  color: integer("color").references(() => color.id),
  file: text("file"),
  parent_id: integer("parent_id")
    .references(() => additionalscan.id)
    .default(null as any),
  category: integer("category").references(() => category.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
