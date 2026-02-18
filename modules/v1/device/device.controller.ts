import { Request, Response } from "express";
import { db } from "../../../db";
import { device } from "../../../db/schema/device";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getDevice = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(device.createdAt) : desc(device.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(device);
    const deviceList = await db
      .select({
        id: device.id,
        title: device.title,
        file: device.file,
      })
      .from(device)
      .where(eq(device.isDeleted , 0))

      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: deviceList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Device fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createDevice = async (req: Request, res: Response) => {
  try {
    const { title, price } = req.body;
    const file = req.file;

    if (!file) {
      return errorResponse(res, 400, "فایل الزامی است", null);
    }

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

    const deviceItem = await db
      .insert(device)
      .values({
        title,
        file: file.path,
      })
      .returning();

    return successResponse(
      res,
      200,
      { device: deviceItem },
      "Device created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { title, price } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (price) updateData.price = price;

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
    const deviceItem = await db
      .update(device)
      .set(updateData)
      .where(eq(device.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      { device: deviceItem },
      "Device updated successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const deviceItem = await db
      .update(device)
      .set({isDeleted : 1})
      .where(eq(device.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      deviceItem,
      "Device deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
