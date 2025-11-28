import { Request, Response } from "express";
import { db } from "../../../db";
import { device } from "../../../db/schema/device";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { eq } from "drizzle-orm";

export const getDevice = async (req: Request, res: Response) => {
  try {
    const deviceList = await db
      .select({
        id: device.id,
        title: device.title,
        price: device.price,
        file: device.file,
      })
      .from(device);
    return successResponse(
      res,
      200,
      deviceList,
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
        price: price,
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
      .delete(device)
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

// routeهای زیر برای device در device.routes.ts تعریف شده‌اند:
//
// router.get("/devices", auth, getDevice);
// router.post(
//   "/device",
//   auth,
//   uploadSingle("file"),
//   validate(createDeviceSchema),
//   createDevice
// );
// router.put(
//   "/device/:id",
//   auth,
//   uploadSingle("file"),
//   validate(updateDeviceSchema),
//   updateDevice
// );
// router.delete("/device/:id", auth, deleteDevice);
//
// توضیح routeها:
// - GET    /devices       : دریافت لیست deviceها
// - POST   /device        : ایجاد device جدید (با آپلود فایل)
// - PUT    /device/:id    : ویرایش device بر اساس id (با آپلود فایل)
// - DELETE /device/:id    : حذف device بر اساس id
