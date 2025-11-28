import {
  pgTable,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { category } from "./category";
import { device } from "./device";
import { materialshade } from "./materialshade";
import { implant } from "./implant";
import { implantattribute } from "./implantattribute";
import { additionalscan } from "./additionalscan";
import { volume } from "./volume";

export const tooth = pgTable("tooth", {
  id: serial("id").primaryKey(),
  toothnumber: integer("toothnumber"),
  category: integer("category")
    .unique()
    .references(() => category.id),
  device: integer("device")
    .unique()
    .references(() => device.id),
  materialshade: integer("materialshade")
    .unique()
    .references(() => materialshade.id),
  implant: integer("implant")
    .unique()
    .references(() => implant.id),
  implantattribute: integer("implantattribute")
    .unique()
    .references(() => implantattribute.id),
  additionalscan: integer("additionalscan")
    .unique()
    .references(() => additionalscan.id),
  volume: integer("volume")
    .unique()
    .references(() => volume.id),
  connection: integer("connection").unique(),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

