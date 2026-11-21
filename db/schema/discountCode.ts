import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const discountKindEnum = ["percent", "fixed"] as const;
export type DiscountKind = (typeof discountKindEnum)[number];
export const discountKindPgEnum = pgEnum("discount_kind", discountKindEnum);

export const discountCode = pgTable(
  "discount_code",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }),
    kind: discountKindPgEnum("kind").$type<DiscountKind>().notNull(),
    value: integer("value").notNull(),
    active: boolean("active").notNull().default(true),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("discount_code_code_unique").on(table.code),
  }),
);
