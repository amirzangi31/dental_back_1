import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { catalog } from "./catalog";
import { color } from "./color";

export const category = pgTable("category", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  file: text("file"),
  color: integer("color").references(() => color.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  haveRedesign: boolean("haveRedesign").notNull().default(false),
  catalog: integer("catalog")
    .references(() => catalog.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

