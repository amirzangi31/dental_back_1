import { Request, Response } from "express";
import { db } from "../../../db";
import { volume } from "../../../db/schema/volume";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";

export const getVolume = async (req: Request, res: Response) => {
  try {
    const volumeList = await db
      .select({
        id: volume.id,
        title: volume.title,
        defaultvalue: volume.defaultvalue,
        start: volume.start,
        end: volume.end,
        price: volume.price,
      })
      .from(volume);
      console.log(volumeList)
    return successResponse(
      res,
      200,
      volumeList,
      "Volume fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createVolume = async (req: Request, res: Response) => {
  try {
    const { title, defaultvalue, start, end, price } = req.body;

    const volumeItem = await db
      .insert(volume)
      .values({
        title,
        defaultvalue: defaultvalue ? String(defaultvalue) : null,
        start: start ? String(start) : null,
        end: end ? String(end) : null,
        price: price ? String(price) : null,
      })
      .returning();

    return successResponse(
      res,
      200,
      volumeItem[0],
      "Volume created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateVolume = async (req: Request, res: Response) => {
  try {
    const { title, defaultvalue, start, end, price } = req.body;
    console.log(defaultvalue)
    const updateData: any = {};
    if (title) updateData.title = title;
    if (start) updateData.start = String(start);
    if (end) updateData.end = String(end);
    if (price) updateData.price = String(price);
    if (defaultvalue) updateData.defaultvalue = String(defaultvalue);

    const volumeItem = await db
      .update(volume)
      .set(updateData)
      .where(eq(volume.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      volumeItem[0],
      "Volume updated successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteVolume = async (req: Request, res: Response) => {
  try {
    const volumeItem = await db
      .delete(volume)
      .where(eq(volume.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      volumeItem,
      "Volume deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

