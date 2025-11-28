import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalname: varchar("originalname", { length: 255 }).notNull(),
  mimetype: varchar("mimetype", { length: 100 }),
  size: bigint("size", { mode: "number" }),
  path: text("path").notNull(),
  user_id: integer("user_id").references(() => users.id),
  isDeleted: integer("isDeleted").default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
