import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { payment } from "./payment";

export const invoice = pgTable(
  "invoice",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payment.id),
    issuedAt: timestamp("issued_at").notNull(),
    buyerName: text("buyer_name"),
    buyerPhone: text("buyer_phone"),
    buyerAddress: text("buyer_address"),
    buyerPostalCode: text("buyer_postal_code"),
    buyerEconomicNumber: text("buyer_economic_number"),
    buyerNationalId: text("buyer_national_id"),
    buyerCity: text("buyer_city"),
    sellerName: text("seller_name"),
    sellerEconomicNumber: text("seller_economic_number"),
    sellerNationalId: text("seller_national_id"),
    sellerRegistrationNumber: text("seller_registration_number"),
    sellerPostalCode: text("seller_postal_code"),
    sellerCity: text("seller_city"),
    sellerAddress: text("seller_address"),
    sellerPhone: text("seller_phone"),
    taxNumber: text("tax_number"),
    taxPercent: decimal("tax_percent", { precision: 10, scale: 2 }).notNull(),
    paidToman: integer("paid_toman").notNull(),
    totalRial: integer("total_rial").notNull(),
    discountRial: integer("discount_rial").notNull().default(0),
    tollRial: integer("toll_rial").notNull().default(0),
    taxRial: integer("tax_rial").notNull(),
    cash: boolean("cash").notNull().default(true),
    trackingCode: text("tracking_code"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderUnique: uniqueIndex("invoice_order_id_unique").on(table.orderId),
    paymentUnique: uniqueIndex("invoice_payment_id_unique").on(table.paymentId),
  }),
);

export const invoiceLine = pgTable("invoice_line", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoice.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  productCode: text("product_code"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitAmountRial: integer("unit_amount_rial").notNull(),
  lineTotalRial: integer("line_total_rial").notNull(),
  discountRial: integer("discount_rial").notNull().default(0),
  amountAfterDiscountRial: integer("amount_after_discount_rial").notNull(),
  taxRial: integer("tax_rial").notNull(),
  tollRial: integer("toll_rial").notNull().default(0),
  taxAndTollRial: integer("tax_and_toll_rial").notNull(),
  totalWithTaxRial: integer("total_with_tax_rial").notNull(),
});
