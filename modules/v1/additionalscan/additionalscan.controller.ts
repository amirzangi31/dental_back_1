import { Request, Response } from "express";
import { db } from "../../../db";
import { additionalscan } from "../../../db/schema/additionalscan";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";
import { color } from "../../../db/schema/color";

export const getAdditionalscan = async (req: Request, res: Response) => {
  try {
    const additionalscanList = await db
      .select({
        id: additionalscan.id,
        title: additionalscan.title,
        price: additionalscan.price,
        color: color.code,
        file: additionalscan.file,
      })
      .from(additionalscan).leftJoin(color, eq(additionalscan.color, color.id));
    console.log(additionalscanList)
    return successResponse(
      res,
      200,
      additionalscanList,
      "AdditionalScan fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createAdditionalscan = async (req: Request, res: Response) => {
  try {
    const { title, price, color } = req.body;
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

    const additionalscanItem = await db
      .insert(additionalscan)
      .values({
        title,
        price: price,
        color: color,
        file: file.path,
      })
      .returning();

    return successResponse(
      res,
      200,
      { additionalscan: additionalscanItem },
      "AdditionalScan created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateAdditionalscan = async (req: Request, res: Response) => {
  try {
    const { title, price, color } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (price) updateData.price = price;
    if (color) updateData.color = color;

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
    const additionalscanItem = await db
      .update(additionalscan)
      .set(updateData)
      .where(eq(additionalscan.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,
      { additionalscan: additionalscanItem },
      "AdditionalScan updated successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteAdditionalscan = async (req: Request, res: Response) => {
  try {
    const additionalscanItem = await db
      .delete(additionalscan)
      .where(eq(additionalscan.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      additionalscanItem,
      "AdditionalScan deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// routeهای زیر برای additionalscan در additionalscan.routes.ts تعریف شده‌اند:
//
// router.get("/additionalscans", auth, getAdditionalscan);
// router.post(
//   "/additionalscan",
//   auth,
//   uploadSingle("file"),
//   validate(createAdditionalscanSchema),
//   createAdditionalscan
// );
// router.put(
//   "/additionalscan/:id",
//   auth,
//   uploadSingle("file"),
//   validate(updateAdditionalscanSchema),
//   updateAdditionalscan
// );
// router.delete("/additionalscan/:id", auth, deleteAdditionalscan);
//
// توضیح routeها:
// - GET    /additionalscans       : دریافت لیست additionalscanها
// - POST   /additionalscan        : ایجاد additionalscan جدید (با آپلود فایل)
// - PUT    /additionalscan/:id    : ویرایش additionalscan بر اساس id (با آپلود فایل)
// - DELETE /additionalscan/:id    : حذف additionalscan بر اساس id
