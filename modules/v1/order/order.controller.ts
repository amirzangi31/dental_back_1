import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { db } from "../../../db";
import { orders, orderTeeth } from "../../../db/schema/orders";
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
      toothnumber: toothData.toothnumber
        ? parseInt(toothData.toothnumber)
        : null,
      category: toothData.category ? parseInt(toothData.category) : null,
      device: toothData.device ? parseInt(toothData.device) : null,
      materialshade: toothData.materialshade
        ? parseInt(toothData.materialshade)
        : null,
      implant: toothData.implant ? parseInt(toothData.implant) : null,
      additionalscan: toothData.additionalscan
        ? parseInt(toothData.additionalscan)
        : null,
      volume: toothData.volume || {
        id: 0,
        defaultValue: 0,
        start: 0,
        end: 0,
      },
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
        status: status || "uploadfile",
        totalaprice: String(totalPrice),
        paymentstatus: paymentstatus || false,
        comment,
        file,
        discount: discount ? parseInt(discount) : null,
        vip: vip || false,
        connections: connections || [],
      })
      .returning();

    const orderTeethData = createdTeeth.map((createdTooth) => ({
      orderId: newOrder.id,
      toothId: createdTooth.id,
    }));

    await db.insert(orderTeeth).values(orderTeethData);

    const orderWithTeeth = await db
      .select()
      .from(orders)
      .where(eq(orders.id, newOrder.id))
      .limit(1);

    return successResponse(
      res,
      201,
      {
        order: orderWithTeeth[0],
        teeth: createdTeeth,
        teethIds: createdTeeth.map((t) => t.id),
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
    if (order[0].user_id !== user.userId) {
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
        device: tooth.device,
        materialshade: tooth.materialshade,
        implant: tooth.implant,
        additionalscan: tooth.additionalscan,
        volume: tooth.volume,
        colorCode: color.code, 
      })
      .from(tooth)
      .leftJoin(category, eq(tooth.category, category.id))
      .leftJoin(color, eq(category.color, color.id))
      .where(inArray(tooth.id, teethIds));

    const teethDataWithOrder = teethData.map((t) => ({
      ...t,
      order: teeth.find((ot) => ot.toothId === t.id),
    }));
    return successResponse(
      res,
      200,
      {
        order: order[0],
        teeth: teethDataWithOrder,
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

    const order = await db.select().from(orders).where(eq(orders.id, +id));
    if (order.length === 0) {
      return errorResponse(res, 404, "Order not found", null);
    }
    if (order[0].user_id !== user.userId) {
      return errorResponse(
        res,
        403,
        "You are not authorized to update this order",
        null
      );
    }

    if (!teeth || !Array.isArray(teeth) || teeth.length === 0) {
      return errorResponse(res, 400, "At least one tooth must be selected", null);
    }

    const oldOrderTeeth = await db.select().from(orderTeeth).where(eq(orderTeeth.orderId, +id));
    const oldToothIds = oldOrderTeeth.map((ot) => ot.toothId);
    if (oldToothIds.length > 0) {
      await db.delete(orderTeeth).where(eq(orderTeeth.orderId, +id));
      await db.delete(tooth).where(inArray(tooth.id, oldToothIds));
    }

    const teethValues = teeth.map((toothData: any) => ({
      toothnumber: toothData.toothnumber ? parseInt(toothData.toothnumber) : null,
      category: toothData.category ? parseInt(toothData.category) : null,
      device: toothData.device ? parseInt(toothData.device) : null,
      materialshade: toothData.materialshade ? parseInt(toothData.materialshade) : null,
      implant: toothData.implant ? parseInt(toothData.implant) : null,
      additionalscan: toothData.additionalscan ? parseInt(toothData.additionalscan) : null,
      volume: toothData.volume || {
        id: 0,
        defaultValue: 0,
        start: 0,
        end: 0,
      },
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

    const newOrderTeethData = createdTeeth.map((createdTooth) => ({
      orderId: +id,
      toothId: createdTooth.id,
    }));

    await db.insert(orderTeeth).values(newOrderTeethData);

    const [updatedOrder] = await db
      .update(orders)
      .set({
        title,
        patientname,
        patientage: patientage ? parseInt(patientage) : null,
        patientgender: patientgender || null,
        report: report ? parseInt(report) : null,
        status: status || "uploadfile",
        totalaprice: String(totalPrice),
        paymentstatus: paymentstatus || false,
        comment,
        file,
        discount: discount ? parseInt(discount) : null,
        vip: vip || false,
        connections: connections || [],
      })
      .where(eq(orders.id, +id))
      .returning();

    return successResponse(
      res,
      200,
      {
        order: updatedOrder,
        teeth: createdTeeth,
        teethIds: createdTeeth.map((t) => t.id),
      },
      "Order updated successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};