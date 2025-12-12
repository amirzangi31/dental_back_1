import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  pgEnum,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { users } from "./users";

export const statusEnum = ["open", "pending", "close"] as const;
export type TicketStatus = (typeof statusEnum)[number];
export const TicketStatusPgEnum = pgEnum("ticketStatus", statusEnum);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),

  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id),

  ticketStatus: TicketStatusPgEnum("ticket_status").$type<TicketStatus>(),
  subject: varchar("subject", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),

  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),

  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id),

  senderType: varchar("sender_type", { length: 10 }).notNull(),

  message: varchar("message", { length: 2000 }),

  file: text("file"),

  createdAt: timestamp("created_at").defaultNow(),
});
