import cron from "node-cron";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { orders } from "../db/schema/orders";
import { payment } from "../db/schema/payment";
import { tickets, ticketMessages } from "../db/schema/ticket";

export const startCleanupOrdersJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
    
      const deletedTicketMessages = await db.delete(ticketMessages).where(
        sql`ticket_id IN (
              SELECT t.id FROM tickets t
              WHERE t.order_id IN (
                SELECT id FROM orders
                WHERE "createdAt" < NOW() - INTERVAL '1 hours'
                  AND NOT EXISTS (
                    SELECT 1 FROM payment p2
                    WHERE p2.order_id = orders.id
                      AND p2.status = 'paid'
                  )
              )
            )`
      );
      console.log(`🧹 Deleted ticket messages: ${deletedTicketMessages.rowCount}`);

      const deletedTickets = await db.delete(tickets).where(
        sql`order_id IN (
              SELECT id FROM orders
              WHERE "createdAt" < NOW() - INTERVAL '1 hours'
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )
            )`
      );
      console.log(`🧹 Deleted tickets: ${deletedTickets.rowCount}`);

      const deletedReportTicketMessages = await db.delete(ticketMessages).where(
        sql`ticket_id IN (
              SELECT report FROM orders
              WHERE "createdAt" < NOW() - INTERVAL '1 hours'
                AND report IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )
            )`
      );
      console.log(`🧹 Deleted report ticket messages: ${deletedReportTicketMessages.rowCount}`);

      const deletedReportTickets = await db.delete(tickets).where(
        sql`id IN (
              SELECT report FROM orders
              WHERE "createdAt" < NOW() - INTERVAL '1 hours'
                AND report IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )
            )`
      );
      console.log(`🧹 Deleted report tickets: ${deletedReportTickets.rowCount}`);

      const deletedPayments = await db.delete(payment).where(
        sql`order_id IN (
              SELECT id FROM orders
              WHERE "createdAt" < NOW() - INTERVAL '1 hours'
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )
            )`
      );
      console.log(`🧹 Deleted payments: ${deletedPayments.rowCount}`);

      const deletedOrders = await db.delete(orders).where(
        sql`"createdAt" < NOW() - INTERVAL '1 hours'
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )`
      );
      console.log(`🧹 Deleted orders: ${deletedOrders.rowCount}`);

    } catch (error) {
      console.error("❌ Cleanup unpaid orders job failed", error);
    }
  });
};
