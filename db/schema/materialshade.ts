import {
  pgTable,
  serial,
  varchar,
  decimal,
  pgEnum,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { color } from "./color";

export const materialShadeCategoryEnum = ["A", "B", "C", "D" , "M"] as const;
export type MaterialShadeCategory = (typeof materialShadeCategoryEnum)[number];
export const materialShadeCategoryPgEnum = pgEnum(
  "materialshadecategory",
  materialShadeCategoryEnum
);

export const materialshade = pgTable("materialshade", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  category: materialShadeCategoryPgEnum("category").$type<MaterialShadeCategory>(),
  color: integer("color").references(() => color.id),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

