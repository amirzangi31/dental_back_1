import {
  pgTable,
  serial,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { color } from "./color";
import { category } from "./category";
import { materialcategory } from "./materialcategory";
export const descriptionStatusEnum = ["none", "file", "text", "all"] as const;
export type descriptionStatus = (typeof descriptionStatusEnum)[number];
export const descriptionStatusPgEnum = pgEnum(
  "descriptionstatus",
  descriptionStatusEnum
);
export const material: any = pgTable("material", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  color: integer("color").references(() => color.id),
  descriptionStatus:
    descriptionStatusPgEnum("descriptionStatus").$type<descriptionStatus>(),
  description: text("description"),
  file: text("file"),
  materialcategory: integer("materialcategory").references(
    () => materialcategory.id
  ),
  category: integer("category").references(() => category.id),
  parent_id: integer("parent_id")
    .references(() => materialcategory.id)
    .default(null as any),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
