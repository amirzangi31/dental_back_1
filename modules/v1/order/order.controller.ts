import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { orders, OrderStatus, orderTeeth } from "../../../db/schema/orders";
import { tooth } from "../../../db/schema/tooth";
import { eq, inArray } from "drizzle-orm";
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
      vip,
      teeth,
      connections,
    } = req.body;

    const user = (req as any).user;

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0) {
      return errorResponse(res, 400, "حداقل یک دندان باید انتخاب شود", null);
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
        vip: vip || false,
        connections: connections || [],
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

    const vipPrice = await db
      .select({ price: vip.price })
      .from(vip)
      .where(eq(vip.id, +vip));
    return successResponse(
      res,
      201,
      {
        order: newOrder,
        teeth: finalTeeth,
        teethIds,
        vip: vipPrice[0].price,
      },
      "سفارش با موفقیت ایجاد شد"
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
      vip,
      teeth,
      connections,
    } = req.body;

    const { id } = req.params;
    const user = (req as any).user;

    // ---------- check order ----------
    const order = await db.select().from(orders).where(eq(orders.id, +id));
    if (!order.length) return errorResponse(res, 404, "Order not found", null);
    if (order[0].user_id !== user.userId)
      return errorResponse(
        res,
        403,
        "You are not authorized to update this order",
        null
      );

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0)
      return errorResponse(res, 400, "حداقل یک دندان باید انتخاب شود", null);

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
        vip: vip || false,
        connections: connections || [],
      })
      .where(eq(orders.id, +id))
      .returning();
    const vipPrice = await db
      .select({ price: vip.price })
      .from(vip)
      .where(eq(vip.id, +vip));
    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        teeth: finalTeeth,
        teethIds,
        vip: vipPrice[0].price,
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
    const { id, vip, comment } = req.params;
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
    if (order[0].status !== "uploadfile")
      return errorResponse(res, 400, "Order is not in uploadfile status", null);
    if (order[0].paymentstatus)
      return errorResponse(res, 400, "Order is already paid", null);

    await db
      .update(orders)
      .set({
        comment: comment || null,
        file: file ? file.path : null,
        status: "design" as OrderStatus,
        vip: vip === "true" || false,
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

    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.user_id, user.userId));

    if (!ordersList.length) {
      return successResponse(res, 200, [], "Orders fetched successfully");
    }

    const ordersWithCategories = await Promise.all(
      ordersList.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));
        const teethIds = teethRelations.map((t) => t.toothId);

        const teethCategories = await db
          .select({
            categoryId: tooth.category,
            categoryName: category.title,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .where(inArray(tooth.id, teethIds));

        const uniqueCategories = teethCategories.reduce((acc: any[], c) => {
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

    return successResponse(
      res,
      200,
      ordersWithCategories,
      "Orders fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const orderDropDown = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const ordersList = await db
      .select({
        id: orders.id,
        title: orders.patientname,
      })
      .from(orders)
      .where(eq(orders.user_id, user.userId));

    return successResponse(res, 200, ordersList, "Orders fetched successfully");
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
    const order = await db.select().from(orders);
    const ordersWithCategories = await Promise.all(
      order.map(async (order) => {
        const teethRelations = await db
          .select()
          .from(orderTeeth)
          .where(eq(orderTeeth.orderId, order.id));
        const teethIds = teethRelations.map((t) => t.toothId);

        const teethCategories = await db
          .select({
            categoryId: tooth.category,
            categoryName: category.title,
          })
          .from(tooth)
          .leftJoin(category, eq(tooth.category, category.id))
          .where(inArray(tooth.id, teethIds));

        const uniqueCategories = teethCategories.reduce((acc: any[], c) => {
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

    return successResponse(
      res,
      200,
      ordersWithCategories,
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
    await db
      .update(orders)
      .set({
        status: status as OrderStatus,
        adminFile: file ? file.path : null,
        totalaprice: totalPrice
          ? String(totalPrice)
          : order?.totalaprice || "0.00",
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
