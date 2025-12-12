import {
  pgTable,
  serial,
  varchar,
  decimal,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { category } from "./category";

export const volume = pgTable("volume", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  defaultvalue : decimal("defaultvalue", { precision: 10, scale: 2 }),
  start: decimal("start", { precision: 10, scale: 2 }),
  end: decimal("end", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  category: integer("category").references(() => category.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

