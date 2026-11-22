import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { orders } from "../../../db/schema/orders";
import { payment } from "../../../db/schema/payment";
import { users } from "../../../db/schema/users";
import { wallet, walletEntry } from "../../../db/schema/wallet";
import { settlePaymentInTransaction, tomanAmount } from "../payment/orderPayment";
import { verifyZarinpalPayment, zarinpalMinimumToman } from "../payment/zarinpal";

export type WalletTopupOutcome = "paid" | "failed" | "pending";

export class WalletPayError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const getOrCreateWallet = async (userId: number) => {
  const [existing] = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (existing) return existing;

  const [created] = await db
    .insert(wallet)
    .values({ userId })
    .onConflictDoNothing({ target: wallet.userId })
    .returning();
  if (created) return created;

  const [again] = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (!again) throw new Error("Wallet could not be created");
  return again;
};

export const creditWalletTopup = async (
  authority: string,
  gatewayStatus: string,
): Promise<WalletTopupOutcome | null> => {
  const [found] = await db
    .select()
    .from(walletEntry)
    .where(eq(walletEntry.authority, authority));

  if (!found || found.kind !== "topup") return null;
  if (found.status === "paid") return "paid";

  if (gatewayStatus !== "OK") {
    await db
      .update(walletEntry)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(walletEntry.id, found.id), eq(walletEntry.status, "pending")));
    return "failed";
  }

  let verified;
  try {
    verified = await verifyZarinpalPayment(found.amountToman, authority);
  } catch {
    return "pending";
  }

  let outcome: WalletTopupOutcome = verified.settled ? "paid" : "failed";
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(walletEntry)
      .where(eq(walletEntry.id, found.id))
      .for("update");

    if (!current || current.kind !== "topup") {
      outcome = "failed";
      return;
    }
    if (current.status === "paid") {
      outcome = "paid";
      return;
    }
    if (!verified.settled) {
      await tx
        .update(walletEntry)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(walletEntry.id, current.id));
      outcome = "failed";
      return;
    }

    const [walletRow] = await tx
      .select()
      .from(wallet)
      .where(eq(wallet.id, current.walletId))
      .for("update");
    if (!walletRow) {
      outcome = "failed";
      return;
    }

    await tx
      .update(wallet)
      .set({
        balanceToman: walletRow.balanceToman + current.amountToman,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id));
    await tx
      .update(walletEntry)
      .set({
        status: "paid",
        refId: verified.refId,
        updatedAt: new Date(),
      })
      .where(eq(walletEntry.id, current.id));
    outcome = "paid";
  });

  return outcome;
};

const maxBalanceToman = 2_147_483_647;

export const increaseWalletByAdmin = async (input: {
  userId: number;
  amountToman: number;
  actorUserId: number;
  note: string | null;
}) => {
  const { userId, amountToman, actorUserId, note } = input;
  if (!Number.isInteger(userId) || userId < 1) {
    throw new WalletPayError(400, "User id is required");
  }
  if (!Number.isInteger(amountToman) || amountToman < 1) {
    throw new WalletPayError(400, "Amount must be a positive integer");
  }

  return db.transaction(async (tx) => {
    const [target] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!target) throw new WalletPayError(404, "User not found");

    await tx.insert(wallet).values({ userId }).onConflictDoNothing({ target: wallet.userId });

    const [locked] = await tx
      .select()
      .from(wallet)
      .where(eq(wallet.userId, userId))
      .for("update");
    if (!locked) throw new WalletPayError(500, "Wallet could not be created");

    const balance = locked.balanceToman + amountToman;
    if (balance > maxBalanceToman) {
      throw new WalletPayError(400, "Amount is too large");
    }

    await tx
      .update(wallet)
      .set({ balanceToman: balance, updatedAt: new Date() })
      .where(eq(wallet.id, locked.id));

    const [entry] = await tx
      .insert(walletEntry)
      .values({
        walletId: locked.id,
        userId,
        kind: "admin",
        status: "paid",
        amountToman,
        note,
        actorUserId,
      })
      .returning();

    return { balance, amount: amountToman, entry };
  });
};

export const payOrderFromWallet = async (orderId: number, userId: number) => {
  if (!orderId) throw new WalletPayError(400, "Order id is required");

  const walletRow = await getOrCreateWallet(userId);

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");

    if (!order) throw new WalletPayError(404, "Order not found");
    if (order.user_id !== userId) {
      throw new WalletPayError(403, "You are not authorized to pay this order");
    }
    if (order.status !== "payment") {
      throw new WalletPayError(400, "Order is not awaiting payment");
    }
    if (order.paymentstatus) {
      throw new WalletPayError(400, "Order is already paid");
    }

    const paymentRows = await tx
      .select()
      .from(payment)
      .where(eq(payment.order_id, orderId))
      .for("update");
    const paidRow = paymentRows.find((row) => row.status === "paid");
    if (paidRow) throw new WalletPayError(400, "Order is already paid");
    const existing = paymentRows[0] ?? null;

    const amount = tomanAmount(order.totalaprice);
    if (amount < zarinpalMinimumToman) {
      throw new WalletPayError(400, "Payable amount must be at least 1000 toman");
    }

    const [lockedWallet] = await tx
      .select()
      .from(wallet)
      .where(eq(wallet.id, walletRow.id))
      .for("update");
    if (!lockedWallet || lockedWallet.balanceToman < amount) {
      throw new WalletPayError(400, "Wallet balance is not enough");
    }

    let paymentId = existing?.id;
    if (!existing) {
      const [created] = await tx
        .insert(payment)
        .values({
          order_id: orderId,
          type: "wallet",
          status: "pending",
          isAccepted: false,
          amount,
        })
        .returning();
      paymentId = created?.id;
    } else {
      await tx
        .update(payment)
        .set({
          type: "wallet",
          status: "pending",
          isAccepted: false,
          amount,
          authority: null,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, existing.id));
    }
    if (!paymentId) throw new WalletPayError(500, "Internal server error");

    await tx
      .update(wallet)
      .set({
        balanceToman: lockedWallet.balanceToman - amount,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, lockedWallet.id));

    await tx.insert(walletEntry).values({
      walletId: lockedWallet.id,
      userId,
      kind: "order",
      status: "paid",
      amountToman: amount,
      orderId,
      paymentId,
    });

    const settled = await settlePaymentInTransaction(tx, paymentId, null);
    return {
      balance: lockedWallet.balanceToman - amount,
      amount,
      payment: settled?.payment ?? null,
    };
  });
};
