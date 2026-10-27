import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const sellerProfile = pgTable(
  "seller_profile",
  {
    id: integer("id").primaryKey().default(1),
    singletonKey: integer("singleton_key").notNull().default(1),
    name: text("name"),
    economicNumber: text("economic_number"),
    nationalId: text("national_id"),
    registrationNumber: text("registration_number"),
    postalCode: text("postal_code"),
    city: text("city"),
    address: text("address"),
    phone: text("phone"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    oneRow: uniqueIndex("seller_profile_singleton").on(table.singletonKey),
  }),
);
