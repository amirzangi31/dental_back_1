import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { color } from "./color";
import { files } from "./files";
import { orders } from "./orders";

export const independentServiceTypeEnum = ["options", "file"] as const;
export type IndependentServiceType = (typeof independentServiceTypeEnum)[number];
export const independentServiceTypePgEnum = pgEnum(
  "independent_service_type",
  independentServiceTypeEnum,
);

export const independentServiceCategory = pgTable(
  "independent_service_category",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDeleted: integer("isDeleted").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    sortIdx: index("independent_service_category_sort_idx").on(table.sortOrder),
  }),
);

export const independentService = pgTable(
  "independent_service",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => independentServiceCategory.id),
    title: varchar("title", { length: 255 }).notNull(),
    type: independentServiceTypePgEnum("type")
      .$type<IndependentServiceType>()
      .notNull(),
    price: decimal("price", { precision: 10, scale: 2 }),
    color: integer("color").references(() => color.id),
    allowFile: boolean("allow_file").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDeleted: integer("isDeleted").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("independent_service_category_id_idx").on(table.categoryId),
    sortIdx: index("independent_service_sort_idx").on(table.sortOrder),
  }),
);

export const independentServiceOption = pgTable(
  "independent_service_option",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id")
      .notNull()
      .references(() => independentService.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    file: text("file"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    color: integer("color").references(() => color.id),
    allowFile: boolean("allow_file").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isDeleted: integer("isDeleted").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    serviceIdx: index("independent_service_option_service_id_idx").on(table.serviceId),
    sortIdx: index("independent_service_option_sort_idx").on(table.sortOrder),
  }),
);

export const orderIndependentService = pgTable(
  "order_independent_service",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: integer("service_id").references(() => independentService.id, {
      onDelete: "set null",
    }),
    optionId: integer("option_id").references(() => independentServiceOption.id, {
      onDelete: "set null",
    }),
    serviceTitle: varchar("service_title", { length: 255 }).notNull(),
    optionTitle: varchar("option_title", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    arch: varchar("arch", { length: 16 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_independent_service_order_id_idx").on(table.orderId),
  }),
);

export const orderIndependentServiceFile = pgTable(
  "order_independent_service_file",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => orderIndependentService.id, { onDelete: "cascade" }),
    fileId: integer("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.itemId, table.fileId] }),
    fileIdx: index("order_independent_service_file_file_id_idx").on(table.fileId),
  }),
);
