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

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  patientname: varchar("patientname", { length: 255 }),
  patientage: integer("patientage"),
  patientgender: patientGenderPgEnum("patientgender").$type<PatientGender>(),
  report: integer("report"),
  status: orderStatusPgEnum("status").$type<OrderStatus>(),
  totalaprice: decimal("totalaprice", { precision: 10, scale: 2 }).default("0.00"),
  paymentstatus: boolean("paymentstatus").default(false),
  comment: text("comment"),
  file: text("file"),
  adminFile: text("adminFile"),
  discount: integer("discount"),
  vip: boolean("vip").default(false),
  isDelivered: boolean("isDelivered").default(false),
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

