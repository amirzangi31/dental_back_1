import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { categorycolor } from "./categorycolor";

export const color = pgTable("color", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  code: varchar("code", { length: 255 }),
  category: integer("category").references(() => categorycolor.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

