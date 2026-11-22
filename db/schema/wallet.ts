import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { payment } from "./payment";
import { users } from "./users";

export const walletEntryKindEnum = ["topup", "order", "admin"] as const;
export type WalletEntryKind = (typeof walletEntryKindEnum)[number];
export const walletEntryKindPgEnum = pgEnum("wallet_entry_kind", walletEntryKindEnum);

export const walletEntryStatusEnum = ["pending", "paid", "failed"] as const;
export type WalletEntryStatus = (typeof walletEntryStatusEnum)[number];
export const walletEntryStatusPgEnum = pgEnum(
  "wallet_entry_status",
  walletEntryStatusEnum,
);

export const wallet = pgTable(
  "wallet",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    balanceToman: integer("balance_toman").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex("wallet_user_id_unique").on(table.userId),
    balanceNonNegative: check(
      "wallet_balance_non_negative",
      sql`${table.balanceToman} >= 0`,
    ),
  }),
);

export const walletEntry = pgTable(
  "wallet_entry",
  {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id")
      .notNull()
      .references(() => wallet.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    kind: walletEntryKindPgEnum("kind").$type<WalletEntryKind>().notNull(),
    status: walletEntryStatusPgEnum("status").$type<WalletEntryStatus>().notNull(),
    amountToman: integer("amount_toman").notNull(),
    note: text("note"),
    actorUserId: integer("actor_user_id").references(() => users.id),
    authority: text("authority"),
    refId: text("ref_id"),
    orderId: integer("order_id").references(() => orders.id),
    paymentId: integer("payment_id").references(() => payment.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    authorityUnique: uniqueIndex("wallet_entry_authority_unique").on(table.authority),
  }),
);
