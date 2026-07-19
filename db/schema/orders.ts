import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  decimal,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tooth } from "./tooth";
import { files } from "./files";

export const patientGenderEnum = ["male", "female"] as const;
export type PatientGender = (typeof patientGenderEnum)[number];
export const patientGenderPgEnum = pgEnum("patientgender", patientGenderEnum);

export const orderStatusEnum = [
  "uploadfile",
  "check",
  "design",
  "approval",
  "payment",
  "finaldelivery",
] as const;
export type OrderStatus = (typeof orderStatusEnum)[number];
export const orderStatusPgEnum = pgEnum("status", orderStatusEnum);

export const orderFileRoleEnum = ["user", "admin", "designer"] as const;
export type OrderFileRole = (typeof orderFileRoleEnum)[number];
export const orderFileRolePgEnum = pgEnum(
  "order_file_role",
  orderFileRoleEnum,
);

export const orders: any = pgTable("orders", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  designer_id: integer("designer_id").references(() => users.id),
  patientname: varchar("patientname", { length: 255 }),
  patientage: integer("patientage"),
  patientgender: patientGenderPgEnum("patientgender").$type<PatientGender>(),
  report: integer("report"),
  status: orderStatusPgEnum("status").$type<OrderStatus>(),
  totalaprice: decimal("totalaprice", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  userfiles: text("userfiles"),
  paymentstatus: boolean("paymentstatus").default(false),
  antagonists: integer("antagonists").array(),
  comment: text("comment"),
  file: text("file"),
  refrence :  integer("refrence").references(() => orders.id)
  .default(null as any),
  adminFile: text("adminFile"),
  discount: integer("discount"),
  vip: boolean("vip").default(false),
  deliveryDate: timestamp("deliveryDate"),
  connections: integer("connections").array(),
  isDeleted: integer("isDeleted").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const orderTeeth = pgTable(
  "order_teeth",
  {
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    toothId: integer("tooth_id")
      .notNull()
      .references(() => tooth.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orderId, table.toothId] }),
  })
);

export const orderFiles = pgTable(
  "order_files",
  {
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fileId: integer("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    role: orderFileRolePgEnum("role").$type<OrderFileRole>().default("user"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orderId, table.fileId] }),
  })
);
