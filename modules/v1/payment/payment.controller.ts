import { Request, Response } from "express";
import { db } from "../../../db";
import { payment, PaymentStatus, paymentStatusEnum, paymentTypeEnum, PaymentType } from "../../../db/schema/payment";
import { orders, orderTeeth } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";
import { combineFilters, matchesText, oneOf, readQuery, searchText } from "../../../utils/listQuery";
import { tooth } from "../../../db/schema/tooth";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { materialshade } from "../../../db/schema/materialshade";
import {
  ensurePendingPayment,
  findOrderPayment,
  settlePaymentInTransaction,
  tomanAmount,
} from "./orderPayment";
import { requestZarinpalPayment, verifyZarinpalPayment } from "./zarinpal";
import { creditWalletTopup, WalletTopupOutcome } from "../wallet/walletLedger";
import { loadIndependentServicesByOrders } from "../independentService/resolveSelection";
export const getPayments = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const status = oneOf(readQuery(req, "status"), paymentStatusEnum, "payment status");
    if (!status.ok) return errorResponse(res, 400, status.error, null);
    const type = oneOf(readQuery(req, "type"), paymentTypeEnum, "payment type");
    if (!type.ok) return errorResponse(res, 400, type.error, null);

    const user = (req as any).user;

    const orderByClause =
      sort === "asc" ? asc(payment.createdAt) : desc(payment.createdAt);

    const whereClause = combineFilters(
      eq(orders.user_id, user.userId),
      status.value ? eq(payment.status, status.value as PaymentStatus) : undefined,
      type.value ? eq(payment.type, type.value as PaymentType) : undefined,
      matchesText(searchText(req), [
        payment.id,
        payment.trackingCode,
        payment.description,
        orders.id,
        orders.title,
        orders.patientname,
      ]),
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(payment)
      .leftJoin(orders, eq(payment.order_id, orders.id))
      .where(whereClause);

    const list = await db
      .select({
        id: payment.id,
        orderId: payment.order_id,
        status: payment.status,
        type: payment.type,
        file: payment.file,
        trackingCode: payment.trackingCode,
        isAccepted: payment.isAccepted,
        description: payment.description,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        order: {
          id: orders.id,
          title: orders.title,
          file: orders.file,
          adminFile: orders.adminFile,
          status: orders.status,
          paymentstatus: orders.paymentstatus,
          totalPrice: orders.totalaprice,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        },
      })
      .from(payment)
      .leftJoin(orders, eq(payment.order_id, orders.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const independentByOrder = await loadIndependentServicesByOrders(
      db,
      list
        .map((item) => item.order?.id)
        .filter((id): id is number => typeof id === "number"),
    );

    const paymentsWithOrderDetails = await Promise.all(
      list.map(async (item) => {
        if (!item.order?.id) {
          return { ...item, order: { ...item.order, teeth: [], independentServices: [] } };
        }

        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, item.order.id));

        const teethIds = teethRelations.map((t) => t.toothId);
        if (!teethIds.length) {
          return {
            ...item,
            order: {
              ...item.order,
              teeth: [],
              independentServices: independentByOrder.get(item.order.id) ?? [],
            },
          };
        }

        const teethCategories = await db
          .select({
            tooth: tooth.toothnumber,
            categoryId: tooth.category,
            categoryName: category.title,
            device: {
              title: device.title,
            },
            materialshade: {
              title: materialshade.title,
            },
            volume: tooth.volume,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .leftJoin(device, eq(tooth.device, device.id))
          .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
          .where(inArray(tooth.id, teethIds));

        return {
          ...item,
          order: {
            ...item.order,
            teeth: teethCategories,
            independentServices: independentByOrder.get(item.order.id) ?? [],
          },
        };
      })
    );

    return successResponse(
      res,
      200,
      {
        items: paymentsWithOrderDetails,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Payments fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await db
      .select({
        id: payment.id,
        orderId: payment.order_id,
        status: payment.status,
        type: payment.type,
        file: payment.file,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        order: {
          id: orders.id,
          status: orders.status,
          paymentstatus: orders.paymentstatus,
        },
      })
      .from(payment)
      .leftJoin(orders, eq(payment.order_id, orders.id))
      .where(eq(payment.id, Number(id)));

    if (!item.length) {
      return errorResponse(res, 404, "Payment not found", null);
    }

    return successResponse(res, 200, item[0], "Payment fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, status, type } = req.body;
    const file = req.file;

    if (status === "paid") {
      return errorResponse(res, 400, "Payment status cannot be set to paid", null);
    }

    const values: any = {
      order_id: orderId ? Number(orderId) : null,
      status,
      type,
      file: file ? file.path : null,
    };

    if (file) {
      await db.insert(files).values({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        user_id: (req as any).user?.id || null,
      });
    }

    const [created] = await db.insert(payment).values(values).returning();

    return successResponse(res, 201, created, "Payment created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderId, status, type } = req.body;
    const file = req.file;

    if (status === "paid") {
      return errorResponse(res, 400, "Payment status cannot be set to paid", null);
    }

    if (status) {
      const [current] = await db
        .select({ status: payment.status })
        .from(payment)
        .where(eq(payment.id, Number(id)));
      if (current?.status === "paid") {
        return errorResponse(res, 400, "A settled payment cannot be changed", null);
      }
    }

    const updateData: any = {};
    if (orderId !== undefined) updateData.order_id = Number(orderId);
    if (status) updateData.status = status;
    if (type) updateData.type = type;

    if (file) {
      await db.insert(files).values({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        user_id: (req as any).user?.id || null,
      });
      updateData.file = file.path;
    }

    const [updated] = await db
      .update(payment)
      .set(updateData)
      .where(eq(payment.id, Number(id)))
      .returning();

    if (!updated) {
      return errorResponse(res, 404, "Payment not found", null);
    }

    return successResponse(res, 200, updated, "Payment updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(payment)
      .where(eq(payment.id, Number(id)))
      .returning();

    if (!deleted.length) {
      return errorResponse(res, 404, "Payment not found", null);
    }

    return successResponse(
      res,
      200,
      deleted[0],
      "Payment deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const uploadFileForPayment = async (_req: Request, res: Response) => {
  return errorResponse(res, 400, "Receipt payment is disabled", null);
};


export const acceptPayment = async (_req: Request, res: Response) => {
  return errorResponse(res, 400, "Receipt payment is disabled", null);
};

const settleVerifiedPayment = (
  paymentId: number,
  refId: string | null,
) => db.transaction((tx) => settlePaymentInTransaction(tx, paymentId, refId));

export const startZarinpalPayment = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const user = (req as any).user;

    if (!orderId) {
      return errorResponse(res, 400, "Order id is required", null);
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);
    if (order.user_id !== user.userId) {
      return errorResponse(res, 403, "You are not authorized to pay this order", null);
    }
    if (order.status !== "payment") {
      return errorResponse(res, 400, "Order is not awaiting payment", null);
    }
    if (order.paymentstatus) {
      return errorResponse(res, 400, "Order is already paid", null);
    }

    const existing = await findOrderPayment(orderId);
    if (existing?.status === "paid") {
      return errorResponse(res, 400, "Order is already paid", null);
    }

    const paymentRow = existing ?? (await ensurePendingPayment(orderId));
    const amount = tomanAmount(order.totalaprice);
    if (amount < 1000) {
      return errorResponse(
        res,
        400,
        "Payable amount must be at least 1000 toman",
        null,
      );
    }

    let started;
    try {
      started = await requestZarinpalPayment(amount, `Order ${orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Zarinpal request failed";
      return errorResponse(res, 502, message, null);
    }

    const [updated] = await db
      .update(payment)
      .set({
        type: "zarinpal",
        status: "pending",
        isAccepted: false,
        authority: started.authority,
        amount,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRow.id))
      .returning();

    return successResponse(
      res,
      200,
      {
        payment: updated,
        authority: started.authority,
        amount,
        url: started.url,
      },
      "Payment started successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const DEFAULT_APP_URL = "https://app.digitda.ir/";

function appReturnUrl(): string {
  const configured = process.env.PAYMENT_RETURN_URL?.trim();
  if (!configured) return DEFAULT_APP_URL;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_APP_URL;
    return url.toString();
  } catch {
    return DEFAULT_APP_URL;
  }
}

function walletReturnUrl(outcome: WalletTopupOutcome): string {
  const destination = new URL("/dashboard/wallet", appReturnUrl());
  destination.searchParams.set("topup", outcome);
  return destination.toString();
}

export const zarinpalCallback = async (req: Request, res: Response) => {
  const returnToApp = () => res.redirect(302, appReturnUrl());

  try {
    const authority = String(req.query.Authority || req.query.authority || "");
    const gatewayStatus = String(req.query.Status || req.query.status || "");

    if (!authority) {
      return returnToApp();
    }

    const [paymentRow] = await db
      .select()
      .from(payment)
      .where(eq(payment.authority, authority));

    if (!paymentRow) {
      const outcome = await creditWalletTopup(authority, gatewayStatus);
      if (outcome) return res.redirect(302, walletReturnUrl(outcome));
      return returnToApp();
    }

    if (paymentRow.status === "paid") {
      return returnToApp();
    }

    if (gatewayStatus !== "OK") {
      await db
        .update(payment)
        .set({
          status: "failed",
          isAccepted: false,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRow.id));

      return returnToApp();
    }

    if (!paymentRow.amount) {
      return returnToApp();
    }

    let verified;
    try {
      verified = await verifyZarinpalPayment(paymentRow.amount, authority);
    } catch {
      return returnToApp();
    }

    if (!verified.settled) {
      await db
        .update(payment)
        .set({
          status: "failed",
          isAccepted: false,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRow.id));

      return returnToApp();
    }

    await settleVerifiedPayment(paymentRow.id, verified.refId);
    return returnToApp();
  } catch {
    return returnToApp();
  }
};
