import { asc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { orders, OrderStatus } from "../../../db/schema/orders";
import { payment } from "../../../db/schema/payment";
import { issueInvoiceForSettlement } from "../invoice/issueInvoice";
import { readInvoiceByOrderId } from "../invoice/readInvoice";

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

const manualSettlementNote = "تسویه دستی توسط مدیر";

export const settleUnpaidOrderByAdmin = async (
  orderId: number,
  paidToman?: number,
) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;

  const existing = await findOrderPayment(orderId);
  if (existing?.status === "paid") {
    if (!order.paymentstatus) {
      await db
        .update(orders)
        .set({ paymentstatus: true, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
    return existing;
  }

  const overrideAmount = Math.round(Number(paidToman ?? 0));
  const amount =
    Number.isFinite(overrideAmount) && overrideAmount > 0
      ? overrideAmount
      : existing?.amount && existing.amount > 0
        ? existing.amount
        : tomanAmount(order.totalaprice);

  let paymentId = existing?.id;
  if (!existing) {
    const [created] = await db
      .insert(payment)
      .values({
        order_id: orderId,
        type: "zarinpal",
        status: "pending",
        isAccepted: false,
        amount: amount || null,
        description: manualSettlementNote,
      })
      .returning();
    paymentId = created?.id;
  } else {
    await db
      .update(payment)
      .set({
        amount: amount || existing.amount,
        description: existing.description ?? manualSettlementNote,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, existing.id));
  }

  if (!paymentId) return null;

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .for("update");

    if (!current) return null;
    if (current.status === "paid") return current;

    const [updatedPayment] = await tx
      .update(payment)
      .set({
        status: "paid",
        isAccepted: true,
        description: current.description ?? manualSettlementNote,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, current.id))
      .returning();

    await tx
      .update(orders)
      .set({
        paymentstatus: true,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await issueInvoiceForSettlement(tx, {
      orderId,
      paymentId: current.id,
      paidToman: current.amount ?? amount ?? 0,
      trackingCode: null,
    });

    return updatedPayment;
  });
};

export const settlePaymentInTransaction = async (
  tx: any,
  paymentId: number,
  refId: string | null,
) => {
  const [current] = await tx
    .select()
    .from(payment)
    .where(eq(payment.id, paymentId))
    .for("update");

  if (!current) return null;
  if (current.status === "paid") {
    const existingInvoice = current.order_id
      ? await readInvoiceByOrderId(current.order_id, tx)
      : null;
    return { payment: current, alreadyPaid: true, invoice: existingInvoice };
  }

  const [updatedPayment] = await tx
    .update(payment)
    .set({
      status: "paid",
      isAccepted: true,
      refId,
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentId))
    .returning();

  if (current.order_id) {
    await tx
      .update(orders)
      .set({
        paymentstatus: true,
        status: "check",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, current.order_id));
  }

  const issuedInvoice = current.order_id
    ? await issueInvoiceForSettlement(tx, {
        orderId: current.order_id,
        paymentId,
        paidToman: current.amount ?? 0,
        trackingCode: refId,
      })
    : null;

  return { payment: updatedPayment, alreadyPaid: false, invoice: issuedInvoice };
};
