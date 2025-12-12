import { Request, Response } from "express";
import { db } from "../../../db";
import { volume } from "../../../db/schema/volume";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq, isNull, or } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getVolume = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(volume.createdAt) : desc(volume.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(volume);
    const volumeList = await db
      .select({
        id: volume.id,
        title: volume.title,
        defaultvalue: volume.defaultvalue,
        start: volume.start,
        end: volume.end,
        price: volume.price,
        category: volume.category,
      })
      .from(volume)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: volumeList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Volume fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getVolumeByCategory = async (req: Request, res: Response) => {
  try {
    const { category, sort } = req.params;
    const orderByClause =
      sort === "asc" ? asc(volume.createdAt) : desc(volume.createdAt);
    const categoryNumber = parseInt(category);
    const volumeList = await db
      .select({
        id: volume.id,
        title: volume.title,
        defaultvalue: volume.defaultvalue,
        start: volume.start,
        end: volume.end,
        price: volume.price,
        category: volume.category,
      })
      .from(volume)
      .where(or(eq(volume.category, categoryNumber), isNull(volume.category)))
      .orderBy(orderByClause);
    return successResponse(res, 200, volumeList, "Volume fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createVolume = async (req: Request, res: Response) => {
  try {
    const { title, defaultvalue, start, end, price, category } = req.body;

    const volumeItem = await db
      .insert(volume)
      .values({
        title,
        defaultvalue: defaultvalue ? String(defaultvalue) : null,
        start: start ? String(start) : null,
        end: end ? String(end) : null,
        price: price ? String(price) : null,
        category: category ? parseInt(category) : null,
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
    const { title, defaultvalue, start, end, price, category } = req.body;
    const updateData: any = {};
    if (title) updateData.title = title;
    if (start) updateData.start = String(start);
    if (end) updateData.end = String(end);
    if (price) updateData.price = String(price);
    if (defaultvalue) updateData.defaultvalue = String(defaultvalue);
    if (category) updateData.category = parseInt(category);
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
    return successResponse(res, 200, volumeItem, "Volume deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
