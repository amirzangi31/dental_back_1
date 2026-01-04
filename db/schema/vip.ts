import {
  pgTable,
  serial,
  decimal,
  text,
  timestamp,
  time,
} from "drizzle-orm/pg-core";

export const vip = pgTable("vip", {
  id: serial("id").primaryKey(),

  price: decimal("price", { precision: 10, scale: 2 }),

  description: text("description"),

  startTime: time("start_time"), 
  endTime: time("end_time"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});