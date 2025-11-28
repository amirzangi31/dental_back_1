import {
  pgTable,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const support = pgTable("support", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

