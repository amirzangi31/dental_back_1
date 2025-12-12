import { Request, Response } from "express";
import { db } from "../../../db";
import { implantattribute } from "../../../db/schema/implantattribute";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { getPagination } from "../../../utils/pagination";

export const getImplantAttribute = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(implantattribute.createdAt) : desc(implantattribute.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(implantattribute);
    const implantAttributeList = await db
      .select({
        id: implantattribute.id,
        title: implantattribute.title,
        price: implantattribute.price,
        color: implantattribute.color,
        file: implantattribute.file,
      })
      .from(implantattribute)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: implantAttributeList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "ImplantAttribute fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createImplantAttribute = async (req: Request, res: Response) => {
  try {
    const { title, price, color } = req.body;
    const file = req.file;

    if (!file) {
      return errorResponse(res, 400, "فایل الزامی است", null);
    }

    // ذخیره اطلاعات فایل در جدول files
    await db.insert(files).values({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      user_id: (req as any).user?.id || null,
    });

    // ذخیره implantattribute با آدرس فایل
    const implantAttributeItem = await db
      .insert(implantattribute)
      .values({
        title,
        price: price ? String(price) : null,
        color: color ? parseInt(color) : null,
        file: file.path, // آدرس فایل را در فیلد file ذخیره می‌کنیم
      })
      .returning();

    return successResponse(
      res,
      200,
      implantAttributeItem[0],
      "ImplantAttribute created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateImplantAttribute = async (req: Request, res: Response) => {
  try {
    const { title, price, color } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (price) updateData.price = String(price);
    if (color) updateData.color = parseInt(color);

    // اگر فایل جدید آپلود شده باشد
    if (file) {
      // ذخیره اطلاعات فایل جدید در جدول files
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

    const implantAttributeItem = await db
      .update(implantattribute)
      .set(updateData)
      .where(eq(implantattribute.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      implantAttributeItem[0],
      "ImplantAttribute updated successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteImplantAttribute = async (req: Request, res: Response) => {
  try {
    const implantAttributeItem = await db
      .delete(implantattribute)
      .where(eq(implantattribute.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      implantAttributeItem,
      "ImplantAttribute deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

