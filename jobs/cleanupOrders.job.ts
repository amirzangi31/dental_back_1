import cron from "node-cron";
import { db } from "../db";
import { and, lt, sql } from "drizzle-orm";
import { orders } from "../db/schema/orders";
import { payment } from "../db/schema/payment";

export const startCleanupOrdersJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const deletedPayments = await db.delete(payment).where(
        sql`order_id IN (
              SELECT id FROM orders
              WHERE "createdAt" < NOW() - INTERVAL '48 hours'
                AND NOT EXISTS (
                  SELECT 1 FROM payment p2
                  WHERE p2.order_id = orders.id
                    AND p2.status = 'paid'
                )
            )`
      );

      console.log(`🧹 Deleted payments: ${deletedPayments.rowCount}`);

      const deletedOrders = await db.delete(orders).where(
        sql`"createdAt" < NOW() - INTERVAL '48 hours'
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
