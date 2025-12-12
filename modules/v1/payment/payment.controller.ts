import { Request, Response } from "express";
import { db } from "../../../db";
import { payment } from "../../../db/schema/payment";
import { orders } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(payment.createdAt) : desc(payment.createdAt);

    const [{ total }] = await db.select({ total: count() }).from(payment);

    const list = await db
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
          totalPrice: orders.totalaprice,
        },
      })
      .from(payment)
      .leftJoin(orders, eq(payment.order_id, orders.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return successResponse(
      res,
      200,
      {
        items: list,
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

    return successResponse(res, 200, deleted[0], "Payment deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

