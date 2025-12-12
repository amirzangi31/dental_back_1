import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const paymentStatusEnum = ["pending", "paid", "failed"] as const;
export const paymentTypeEnum = ["uploadfile", "paypal"] as const;
export type PaymentStatus = (typeof paymentStatusEnum)[number];

export const paymentStatusPgEnum = pgEnum("paymentStatus", paymentStatusEnum);
export type PaymentType = (typeof paymentTypeEnum)[number];
export const paymentTypePgEnum = pgEnum("type", paymentTypeEnum);

export const payment = pgTable("payment", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id),
  status: paymentStatusPgEnum("status").$type<PaymentStatus>(),
  file: text("file"),
  isAccepted: boolean("isAccepted").default(false),
  type: paymentTypePgEnum("type").$type<PaymentType>(),
  trackingCode: text("trackingCode"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
