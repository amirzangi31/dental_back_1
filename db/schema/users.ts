import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean
} from "drizzle-orm/pg-core";

export const userRoles = ["doctor", "admin", "labrator"] as const;
export type UserRole = (typeof userRoles)[number];
export const roleEnum = pgEnum("role", userRoles);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  postalCode: varchar("postalcode", { length: 100 }).notNull(),
  email: text("email").notNull(),
  password: text("password"),
  googleId: text("googleId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  isDeleted: integer("isDeleted").notNull().default(1),
  role: roleEnum("role").$type<UserRole>().notNull().default("doctor"),
  specaility: varchar("specaility", { length: 100 }),
  laboratoryName: varchar("laboratoryName", { length: 100 }),
  phoneNumber: varchar("phoneNumber", { length: 100 }),
});
  