import { Request, Response } from "express";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { walletEntry } from "../../../db/schema/wallet";
import { errorResponse, successResponse } from "../../../utils/responses";
import { getPagination } from "../../../utils/pagination";
import { requestZarinpalPayment } from "../payment/zarinpal";
import {
  getOrCreateWallet,
  increaseWalletByAdmin,
  payOrderFromWallet,
  WalletPayError,
} from "./walletLedger";

export const walletTopupMinimumToman = 100_000;

const readAmount = (value: unknown) => {
  const amount = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof amount !== "number" || !Number.isInteger(amount)) return null;
  return amount;
};

export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const { limit, offset, sort, page } = getPagination(req);
    const account = await getOrCreateWallet(userId);
    const whereClause = eq(walletEntry.userId, userId);

    const [{ total }] = await db
      .select({ total: count() })
      .from(walletEntry)
      .where(whereClause);

    const entries = await db
      .select({
        id: walletEntry.id,
        kind: walletEntry.kind,
        status: walletEntry.status,
        amountToman: walletEntry.amountToman,
        note: walletEntry.note,
        orderId: walletEntry.orderId,
        refId: walletEntry.refId,
        createdAt: walletEntry.createdAt,
      })
      .from(walletEntry)
      .where(whereClause)
      .orderBy(sort === "asc" ? asc(walletEntry.createdAt) : desc(walletEntry.createdAt))
      .limit(limit)
      .offset(offset);

    return successResponse(
      res,
      200,
      {
        balance: account.balanceToman,
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Wallet fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const startWalletTopup = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const amount = readAmount(req.body?.amount);
    if (amount === null || amount < walletTopupMinimumToman) {
      return errorResponse(
        res,
        400,
        `Payable amount must be at least ${walletTopupMinimumToman} toman`,
        null,
      );
    }

    const account = await getOrCreateWallet(userId);
    const [entry] = await db
      .insert(walletEntry)
      .values({
        walletId: account.id,
        userId,
        kind: "topup",
        status: "pending",
        amountToman: amount,
      })
      .returning();

    let started;
    try {
      started = await requestZarinpalPayment(amount, `Wallet ${userId}`);
    } catch (error) {
      await db
        .update(walletEntry)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(walletEntry.id, entry.id));
      const message = error instanceof Error ? error.message : "Zarinpal request failed";
      return errorResponse(res, 502, message, null);
    }

    const [updated] = await db
      .update(walletEntry)
      .set({
        authority: started.authority,
        updatedAt: new Date(),
      })
      .where(eq(walletEntry.id, entry.id))
      .returning();

    return successResponse(
      res,
      200,
      {
        authority: started.authority,
        amount,
        url: started.url,
        entry: updated,
      },
      "Wallet topup started successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const increaseWalletBalance = async (req: Request, res: Response) => {
  try {
    const actorUserId = Number((req as any).user.userId);
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const result = await increaseWalletByAdmin({
      userId: Number(req.body?.userId),
      amountToman: Number(req.body?.amount),
      actorUserId,
      note: note || null,
    });
    return successResponse(res, 200, result, "Wallet balance increased");
  } catch (error) {
    if (error instanceof WalletPayError) {
      return errorResponse(res, error.statusCode, error.message, null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const payOrderWithWallet = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const userId = Number((req as any).user.userId);
    const result = await payOrderFromWallet(orderId, userId);
    return successResponse(res, 200, result, "Order paid from wallet");
  } catch (error) {
    if (error instanceof WalletPayError) {
      return errorResponse(res, error.statusCode, error.message, null);
    }
    return errorResponse(res, 500, "Internal server error", error);
  }
};
