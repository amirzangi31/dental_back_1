import { Request, Response } from "express";
import { db } from "../../../db";
import { payment, PaymentStatus } from "../../../db/schema/payment";
import { orders, orderTeeth } from "../../../db/schema/orders";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";
import { tooth } from "../../../db/schema/tooth";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { materialshade } from "../../../db/schema/materialshade";
export const getPayments = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const { status } = req.query as { status?: PaymentStatus };

    const user = (req as any).user;

    const orderByClause =
      sort === "asc" ? asc(payment.createdAt) : desc(payment.createdAt);

    const whereConditions = [
      eq(orders.user_id, user.userId),
    ];

    if (status) {
      whereConditions.push(eq(payment.status, status));
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(payment)
      .leftJoin(orders, eq(payment.order_id, orders.id))
      .where(and(...whereConditions));

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
      .where(and(...whereConditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const paymentsWithOrderDetails = await Promise.all(
      list.map(async (item) => {
        if (!item.order?.id) {
          return { ...item, order: { ...item.order, teeth: [] } };
        }

        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, item.order.id));

        const teethIds = teethRelations.map((t) => t.toothId);
        if (!teethIds.length) {
          return { ...item, order: { ...item.order, teeth: [] } };
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

export const uploadFileForPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { trackingCode } = req.body;
    const file = req.file;
    if (!file) {
      return errorResponse(res, 400, "File is required", null);
    }
    if (!trackingCode) {
      return errorResponse(res, 400, "Tracking code is required", null);
    }
    if (!id) {
      return errorResponse(res, 400, "Payment id is required", null);
    }
    const paymentItem = await db
      .select({
        userId: orders.user_id,
      })
      .from(payment)
      .where(eq(payment.id, Number(id)))
      .leftJoin(orders, eq(payment.order_id, orders.id));
    if (!paymentItem.length) {
      return errorResponse(res, 404, "Payment not found", null);
    }
    const user = (req as any).user;

    if (paymentItem[0].userId !== user.userId) {
      return errorResponse(res, 403, "You are not authorized to upload file for this payment", null);
    }

    await db.update(payment).set({
      file: file.path,
      trackingCode: trackingCode,
      isAccepted : false,
      status: "pending",
    }).where(eq(payment.id, Number(id)));

    const updatedPayment = await db.select().from(payment).where(eq(payment.id, Number(id)));
    return successResponse(res, 200, updatedPayment[0], "File uploaded successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};


export const acceptPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accept  , description  } = req.body;
    const user = (req as any).user; 
    if (user.role !== "admin") {
      return errorResponse(res, 403, "You are not authorized to accept this payment", null);
    }
    const paymentItem = await db.select().from(payment).where(eq(payment.id, Number(id)));
    if (!paymentItem.length) {
      return errorResponse(res, 404, "Payment not found", null);
    }

    if(accept) {
      await db.update(payment).set({
        isAccepted: true,
        status: "paid",
        description: description,
      }).where(eq(payment.id, Number(id)));
    }
    else {
      await db.update(payment).set({
        isAccepted: false,
        description: description,
        status: "failed",
      }).where(eq(payment.id, Number(id)));
    }
    return successResponse(res, 200, {} , "Payment accepted successfully", );

  }
  catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
}