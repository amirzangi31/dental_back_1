import {
  pgTable,
  serial,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { category } from "./category";
import { device } from "./device";
import { materialshade } from "./materialshade";

export const tooth = pgTable("tooth", {
  id: serial("id").primaryKey(),
  toothnumber: integer("toothnumber"),
  category: integer("category").references(() => category.id),
  device: integer("device").references(() => device.id),
  materialshade: integer("materialshade").references(() => materialshade.id),
  materials: jsonb("materials")
    .$type<
      { material: number; file: number; text: string }[]
    >()
    .default([]),

  volume: jsonb("volume")
    .notNull()
    .$type<
      {
        id: number;
        defaultvalue: number;
        start: number;
        end: number;
        price: number;
        title: string;
      }[]
    >()
    .default([]),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
