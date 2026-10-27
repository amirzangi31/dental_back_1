import { asc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { OrderStatus } from "../../../db/schema/orders";
import { payment } from "../../../db/schema/payment";

export const workOrderStatuses: OrderStatus[] = [
  "check",
  "design",
  "approval",
  "finaldelivery",
];

export const isWorkOrderStatus = (status: string): boolean =>
  workOrderStatuses.includes(status as OrderStatus);

export const tomanAmount = (
  totalaprice: string | number | null | undefined,
): number => {
  const amount = Math.round(Number(totalaprice ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
};

export const findOrderPayment = async (orderId: number) => {
  const rows = await db
    .select()
    .from(payment)
    .where(eq(payment.order_id, orderId))
    .orderBy(asc(payment.id));

  return rows.find((row) => row.status === "paid") ?? rows[0] ?? null;
};

export const ensurePendingPayment = async (orderId: number) => {
  const existing = await findOrderPayment(orderId);
  if (existing?.status === "paid") return existing;

  if (!existing) {
    const [created] = await db
      .insert(payment)
      .values({
        order_id: orderId,
        type: "zarinpal",
        status: "pending",
        isAccepted: false,
      })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(payment)
    .set({
      type: "zarinpal",
      status: "pending",
      isAccepted: false,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, existing.id))
    .returning();

  return updated;
};
