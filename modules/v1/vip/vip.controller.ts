import { Request, Response } from "express";
import { db } from "../../../db";
import { vip } from "../../../db/schema/vip";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";

export const getVip = async (req: Request, res: Response) => {
  try {
    const vipList = await db
      .select({
        id: vip.id,
        price: vip.price,
        description: vip.description,
      })
      .from(vip);
    return successResponse(
      res,
      200,
      vipList,
      "VIP prices fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getVipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vipItem = await db
      .select({
        id: vip.id,
        price: vip.price,
        description: vip.description,
      })
      .from(vip)
      .where(eq(vip.id, Number(id)))
      .limit(1);

    if (vipItem.length === 0) {
      return errorResponse(res, 404, "VIP not found", null);
    }

    return successResponse(res, 200, vipItem[0], "VIP fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createVip = async (req: Request, res: Response) => {
  try {
    const { price, description } = req.body;
    const [createdVip] = await db
      .insert(vip)
      .values({ price, description })
      .returning();
    return successResponse(res, 201, createdVip, "VIP created successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateVip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, description } = req.body;

    const [updatedVip] = await db
      .update(vip)
      .set({ price, description })
      .where(eq(vip.id, Number(id)))
      .returning();

    if (!updatedVip) {
      return errorResponse(res, 404, "VIP not found", null);
    }

    return successResponse(res, 200, updatedVip, "VIP updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteVip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedVip = await db
      .delete(vip)
      .where(eq(vip.id, Number(id)))
      .returning();

    if (deletedVip.length === 0) {
      return errorResponse(res, 404, "VIP not found", null);
    }

    return successResponse(res, 200, deletedVip[0], "VIP deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
