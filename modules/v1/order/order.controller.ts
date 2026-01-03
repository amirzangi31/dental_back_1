import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { orders, OrderStatus, orderTeeth } from "../../../db/schema/orders";
import { tooth } from "../../../db/schema/tooth";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { calculateTeethTotalPrice } from "../../../utils/calculateTeethPrice";
import { category } from "../../../db/schema/category";
import { device } from "../../../db/schema/device";
import { materialshade } from "../../../db/schema/materialshade";
import { implant } from "../../../db/schema/implant";
import { additionalscan } from "../../../db/schema/additionalscan";
import { volume } from "../../../db/schema/volume";
import { color } from "../../../db/schema/color";
import { files } from "../../../db/schema/files";
import path from "path";
import { vip } from "../../../db/schema/vip";
import { getPagination } from "../../../utils/pagination";
import { payment, PaymentStatus } from "../../../db/schema/payment";
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      title,
      patientname,
      patientage,
      patientgender,
      report,
      status,
      paymentstatus,
      comment,
      file,
      discount,
      vip: vipParametr,
      teeth,
      connections,
      antagonists,
    } = req.body;

    const user = (req as any).user;

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0) {
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null
      );
    }

    const teethValues = teeth.map((toothData: any) => ({
      toothnumber: +toothData.toothnumber || null,
      category: +toothData.category || null,
      device: +toothData.device || null,
      materialshade: +toothData.materialshade || null,
      implant: +toothData.implant || null,
      additionalscan: +toothData.additionalscan || null,
      volume: toothData.volume || [],
    }));

    const totalPrice = await calculateTeethTotalPrice(db, teethValues, {
      category,
      device,
      materialshade,
      implant,
      additionalscan,
      volume,
    });

    const createdTeeth = await db.insert(tooth).values(teethValues).returning();

    const [newOrder] = await db
      .insert(orders)
      .values({
        title,
        user_id: +user.userId,
        patientname,
        patientage: patientage ? parseInt(patientage) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report) : null,
        status: "check",
        totalaprice: String(totalPrice),
        paymentstatus: paymentstatus || false,
        comment,
        file,
        discount: discount ? parseInt(discount) : null,
        vip: vipParametr === "true" || false,
        connections: connections || [],
        antagonists: antagonists || [],
      })
      .returning();

    const orderTeethData = createdTeeth.map((t) => ({
      orderId: newOrder.id,
      toothId: t.id,
    }));

    await db.insert(orderTeeth).values(orderTeethData);

    const teethIds = createdTeeth.map((t) => t.id);

    const detailedTeeth = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        devicePrice: device.price,
        materialshade: tooth.materialshade,
        materialshadePrice: materialshade.price,
        implant: tooth.implant,
        implantPrice: implant.price,
        additionalscan: tooth.additionalscan,
        additionalscanPrice: additionalscan.price,
        volume: tooth.volume,
        colorCode: color.code,
        color: color.id,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(implant, eq(tooth.implant, implant.id))
      .leftJoin(additionalscan, eq(tooth.additionalscan, additionalscan.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const finalTeeth = detailedTeeth.map((t) => {
      const volumeTotal = Array.isArray(t.volume)
        ? t.volume.reduce((sum, v) => sum + +(v.price ?? 0), 0)
        : 0;

      const total =
        Number(t.categoryPrice ?? 0) +
        Number(t.devicePrice ?? 0) +
        Number(t.materialshadePrice ?? 0) +
        Number(t.implantPrice ?? 0) +
        Number(t.additionalscanPrice ?? 0) +
        volumeTotal;

      return {
        ...t,
        price: total,
      };
    });

    const [vipPrice] = await db.select({ price: vip.price }).from(vip);
    return successResponse(
      res,
      201,
      {
        order: newOrder,
        teeth: finalTeeth,
        teethIds,
        vip: vipPrice ? vipPrice.price : 0,
      },
      "Order created successfully"
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getOrderWithId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const order = await db.select().from(orders).where(eq(orders.id, +id));

    if (order.length === 0) {
      return errorResponse(res, 404, "Order not found", null);
    }
    if (order[0].user_id !== user.userId && user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this order",
        null
      );
    }
    const teeth = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, order[0].id));
    if (teeth.length === 0) {
      return errorResponse(res, 404, "Teeth not found", null);
    }

    const teethIds = teeth.map((t) => t.toothId);

    const teethData = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        devicePrice: device.price,
        materialshade: tooth.materialshade,
        materialshadePrice: materialshade.price,
        implant: tooth.implant,
        implantPrice: implant.price,
        additionalscan: tooth.additionalscan,
        additionalscanPrice: additionalscan.price,
        volume: tooth.volume,
        colorCode: color.code,
        color: color.id,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(implant, eq(tooth.implant, implant.id))
      .leftJoin(additionalscan, eq(tooth.additionalscan, additionalscan.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const teethDataWithOrder = teethData.map((t) => {
      const volumeTotal = Array.isArray(t.volume)
        ? t.volume.reduce((sum, v) => sum + +(v.price ?? 0), 0)
        : 0;

      const totalPrice =
        Number(t.categoryPrice ?? 0) +
        Number(t.devicePrice ?? 0) +
        Number(t.materialshadePrice ?? 0) +
        Number(t.implantPrice ?? 0) +
        Number(t.additionalscanPrice ?? 0) +
        volumeTotal;

      return {
        ...t,
        price: totalPrice,
        order: teeth.find((ot) => ot.toothId === t.id),
      };
    });

    const vipPrice = await db.select({ price: vip.price }).from(vip);
    return successResponse(
      res,
      200,
      {
        order: order[0],
        teeth: teethDataWithOrder,
        vip: vipPrice[0]?.price || 0,
      },
      "Order fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const {
      title,
      patientname,
      patientage,
      patientgender,
      report,
      status,
      paymentstatus,
      comment,
      file,
      discount,
      vip: vipParametr,
      teeth,
      connections,
      antagonists,
    } = req.body;
    const { id } = req.params;
    const user = (req as any).user;

    // ---------- check order ----------
    const order = await db.select().from(orders).where(eq(orders.id, +id));
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId && user.role !== "admin")
      return errorResponse(
        res,
        403,
        "You are not authorized to update this order",
        null
      );

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0)
      return errorResponse(
        res,
        400,
        "At least one tooth must be selected",
        null
      );

    // ---------- remove old teeth ----------
    const oldTeeth = await db
      .select()
      .from(orderTeeth)
      .where(eq(orderTeeth.orderId, +id));
    const oldToothIds = oldTeeth.map((t) => t.toothId);
    if (oldToothIds.length) {
      await db.delete(orderTeeth).where(eq(orderTeeth.orderId, +id));
      await db.delete(tooth).where(inArray(tooth.id, oldToothIds));
    }

    // ---------- create new teeth & compute prices ----------
    const teethValues = teeth.map((t: any) => ({
      toothnumber: +t.toothnumber || null,
      category: +t.category || null,
      device: +t.device || null,
      materialshade: +t.materialshade || null,
      implant: +t.implant || null,
      additionalscan: +t.additionalscan || null,
      volume: t.volume || [],
    }));

    const totalPrice = await calculateTeethTotalPrice(db, teethValues, {
      category,
      device,
      materialshade,
      implant,
      additionalscan,
      volume,
    });

    const createdTeeth = await db.insert(tooth).values(teethValues).returning();

    // ---------- insert orderTeeth ----------
    const orderTeethData = createdTeeth.map((t) => ({
      orderId: +id,
      toothId: t.id,
    }));
    if (orderTeethData.length)
      await db.insert(orderTeeth).values(orderTeethData);

    const teethIds = createdTeeth.map((t) => t.id);

    // ---------- fetch detailed teeth info ----------
    const detailedTeeth = await db
      .select({
        id: tooth.id,
        toothnumber: tooth.toothnumber,
        category: tooth.category,
        categoryName: category.title,
        categoryPrice: category.price,
        device: tooth.device,
        devicePrice: device.price,
        materialshade: tooth.materialshade,
        materialshadePrice: materialshade.price,
        implant: tooth.implant,
        implantPrice: implant.price,
        additionalscan: tooth.additionalscan,
        additionalscanPrice: additionalscan.price,
        volume: tooth.volume,
        colorCode: color.code,
        color: color,
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(device, eq(tooth.device, device.id))
      .leftJoin(materialshade, eq(tooth.materialshade, materialshade.id))
      .leftJoin(implant, eq(tooth.implant, implant.id))
      .leftJoin(additionalscan, eq(tooth.additionalscan, additionalscan.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const finalTeeth = detailedTeeth.map((t) => {
      const volumeTotal = Array.isArray(t.volume)
        ? t.volume.reduce((sum, v) => sum + +(v.price ?? 0), 0)
        : 0;
      const total =
        Number(t.categoryPrice ?? 0) +
        Number(t.devicePrice ?? 0) +
        Number(t.materialshadePrice ?? 0) +
        Number(t.implantPrice ?? 0) +
        Number(t.additionalscanPrice ?? 0) +
        volumeTotal;

      return {
        ...t,
        price: total,
      };
    });

    // ---------- update order ----------
    const [updatedOrder] = await db
      .update(orders)
      .set({
        title,
        patientname,
        patientage: patientage ? parseInt(patientage, 10) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report, 10) : null,
        status: status || "uploadfile",
        totalaprice: String(totalPrice),
        paymentstatus: paymentstatus || false,
        comment,
        file,
        discount: discount ? parseInt(discount, 10) : null,
        vip: vipParametr === "true" || false,
        connections: connections || [],
        antagonists: antagonists || [],
      })
      .where(eq(orders.id, +id))
      .returning();
    const [vipPrice] = await db.select({ price: vip.price }).from(vip);

    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        teeth: finalTeeth,
        teethIds,
        vip: vipPrice ? vipPrice.price : 0,
      },
      "Order updated successfully"
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const submitOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vip, comment } = req.body;
    const user = (req as any).user;
    const order = await db.select().from(orders).where(eq(orders.id, +id));
    const file = req.file;
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId)
      return errorResponse(
        res,
        403,
        "You are not authorized to submit this order",
        null
      );

    if (order[0].paymentstatus)
      return errorResponse(res, 400, "Order is already paid", null);
    const paymentItem = await db
      .select()
      .from(payment)
      .where(eq(payment.order_id, +id));
    if (paymentItem.length) {
      return errorResponse(res, 400, "Payment already exists", null);
    }
    await db.insert(payment).values({
      order_id: +id,
      type: "uploadfile",
      status: "pending",
    });
    await db
      .update(orders)
      .set({
        comment: comment || null,
        file: file ? file.path : null,
        status: "design" as OrderStatus,
        vip: vip,
      })
      .where(eq(orders.id, +id));

    return successResponse(res, 200, {}, "Order submitted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderList = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const { isDelivered, paymentStatus } = req.query as {
      isDelivered?: string;
      paymentStatus?: PaymentStatus;
    };

    /* ------------------ WHERE CONDITIONS ------------------ */
    const whereConditions = [
      eq(orders.user_id, user.userId),
      eq(orders.isDeleted, 0),
    ];

    if (isDelivered !== undefined) {
      whereConditions.push(eq(orders.isDelivered, isDelivered === "true"));
    }

    const paymentStatusCondition = paymentStatus
      ? eq(payment.status, paymentStatus)
      : undefined;

    /* ------------------ TOTAL COUNT ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition));

    /* ------------------ ORDERS LIST ------------------ */
    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.title,
        status: orders.status,
        isDelivered: orders.isDelivered,
        paymentstatus: orders.paymentstatus,
        totalaprice: orders.totalaprice,
        comment: orders.comment,
        file: orders.file,
        adminFile: orders.adminFile,
        discount: orders.discount,
        vip: orders.vip,
        deliveryDate: orders.deliveryDate,
        report: orders.report,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,

        payment: {
          id: payment.id,
          status: payment.status,
          isAccepted: payment.isAccepted,
          type: payment.type,
          trackingCode: payment.trackingCode,
        },
      })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    if (!ordersList.length) {
      return successResponse(
        res,
        200,
        {
          items: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
          },
        },
        "Orders fetched successfully"
      );
    }

    /* ------------------ CATEGORIES ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        if (!teethIds.length) {
          return { ...order, categories: [] };
        }

        const teethCategories = await db
          .select({
            categoryId: tooth.category,
            categoryName: category.title,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .where(inArray(tooth.id, teethIds));

        const uniqueCategories = teethCategories.reduce<
          { categoryId: number | null; categoryName: string | null }[]
        >((acc, c) => {
          if (!acc.find((x) => x.categoryId === c.categoryId)) {
            acc.push(c);
          }
          return acc;
        }, []);

        return {
          ...order,
          categories: uniqueCategories,
        };
      })
    );

    /* ------------------ RESPONSE ------------------ */
    return successResponse(
      res,
      200,
      {
        items: ordersWithCategories,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderDropDown = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.user_id, user.userId));

    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.patientname,
      })
      .from(orders)
      .where(eq(orders.user_id, user.userId))
      .orderBy(orderByClause);

    return successResponse(
      res,
      200,
      {
        items: ordersList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderListAdmin = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this resource",
        null
      );
    }

    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const { isDelivered, paymentStatus } = req.query as {
      isDelivered?: string;
      paymentStatus?: PaymentStatus;
    };

    /* ------------------ WHERE CONDITIONS ------------------ */
    const whereConditions = [eq(orders.isDeleted, 0)];

    if (isDelivered !== undefined) {
      whereConditions.push(eq(orders.isDelivered, isDelivered === "true"));
    }

    const paymentStatusCondition = paymentStatus
      ? eq(payment.status, paymentStatus)
      : undefined;

    /* ------------------ TOTAL ------------------ */
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition));

    /* ------------------ ORDERS ------------------ */
    const ordersList = await db
      .select()
      .from(orders)
      .leftJoin(payment, eq(payment.order_id, orders.id))
      .where(and(...whereConditions, paymentStatusCondition))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    /* ------------------ CATEGORIES + PAYMENT (OUTPUT SAME) ------------------ */
    const ordersWithCategories = await Promise.all(
      ordersList.map(async ({ orders: order }) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));

        const teethIds = teethRelations.map((t) => t.toothId);

        const teethCategories = teethIds.length
          ? await db
              .select({
                categoryId: tooth.category,
                categoryName: category.title,
              })
              .from(tooth)
              .leftJoin(category, eq(tooth.category, category.id))
              .where(inArray(tooth.id, teethIds))
          : [];

        const uniqueCategories = teethCategories.reduce<
          { categoryId: number | null; categoryName: string | null }[]
        >((acc, c) => {
          if (!acc.find((x) => x.categoryId === c.categoryId)) {
            acc.push(c);
          }
          return acc;
        }, []);

        const paymentItem = await db
          .select({
            id: payment.id,
            status: payment.status,
            isAccepted: payment.isAccepted,
            type: payment.type,
            file: payment.file,
            trackingCode: payment.trackingCode,
            description: payment.description,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          })
          .from(payment)
          .where(eq(payment.order_id, order.id));

        return {
          ...order,
          categories: uniqueCategories,
          payment: paymentItem[0] || null,
        };
      })
    );

    /* ------------------ RESPONSE ------------------ */
    return successResponse(
      res,
      200,
      {
        items: ordersWithCategories.filter((item) => item.payment !== null),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Orders fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const changeOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, orderId, totalPrice } = req.body;
    const user = (req as any).user;
    if (user.role !== "admin") {
      return errorResponse(
        res,
        403,
        "You are not authorized to access this resource",
        null
      );
    }
    const file = req.file;
    if (file) {
      const fileRecord = await db
        .insert(files)
        .values({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          user_id: (req as any).user?.id || null,
        })
        .returning();
    }
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, +orderId));
    if (!order) return errorResponse(res, 404, "Order not found", null);

    const vipPrice = await db.select({ price: vip.price }).from(vip);
    if (vipPrice.length === 0) {
      return errorResponse(res, 404, "VIP price not found", null);
    }

    await db
      .update(orders)
      .set({
        status: status as OrderStatus,
        adminFile: file ? file.path : null,
        totalaprice: String(Number(totalPrice) + Number(vipPrice[0]?.price)),
      })
      .where(eq(orders.id, +orderId));
    return successResponse(
      res,
      200,
      {
        order: orderId,
      },
      "Order status changed successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const downloadAdminFile = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const user = (req as any).user;

    const [order] = await db
      .select({ adminFile: orders.adminFile, user_id: orders.user_id })
      .from(orders)
      .where(eq(orders.id, +orderId));

    if (!order) {
      return errorResponse(res, 404, "Order not found", null);
    }

    if (user.userId !== order.user_id && user.role === "user") {
      return errorResponse(
        res,
        403,
        "You are not authorized to download this file",
        null
      );
    }

    if (!order.adminFile) {
      return errorResponse(
        res,
        404,
        "Admin file not found for this order",
        null
      );
    }
    await db
      .update(orders)
      .set({
        isDelivered: true,
        deliveryDate: new Date(),
        status: "finaldelivery" as OrderStatus,
      })
      .where(eq(orders.id, +orderId));

    const filePath = path.join(process.cwd(), order.adminFile);

    return res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return errorResponse(res, 500, "Error in file download", err);
      }
    });
  } catch (error) {
    console.error("Error in downloadAdminFile:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const calculateFormPrice = async (req: Request, res: Response) => {
  try { 
    const { teeth, } = req.body;

    const teethValues = teeth.map((toothData: any) => ({
      toothnumber: +toothData.toothnumber || null,
      category: +toothData.category || null,
      device: +toothData.device || null,
      materialshade: +toothData.materialshade || null,
      materials : [],
      volume: toothData.volume || [],
    }));

    const totalPrice = await calculateTeethTotalPrice(db, teethValues, {
      category,
      device,
      materialshade,
      implant,
      additionalscan,
      volume,
    });

    return successResponse(res, 200, { totalPrice }, "Price calculated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
