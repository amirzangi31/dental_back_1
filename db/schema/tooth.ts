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
import { implant } from "./implant";
import { additionalscan } from "./additionalscan";

export const tooth = pgTable("tooth", {
  id: serial("id").primaryKey(),
  toothnumber: integer("toothnumber"),
  category: integer("category").references(() => category.id),
  device: integer("device").references(() => device.id),
  materialshade: integer("materialshade").references(() => materialshade.id),
  implant: integer("implant").references(() => implant.id),

  additionalscan: integer("additionalscan").references(() => additionalscan.id),

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
