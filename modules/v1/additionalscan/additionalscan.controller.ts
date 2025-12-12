import { Request, Response } from "express";
import { db } from "../../../db";
import { additionalscan } from "../../../db/schema/additionalscan";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq, isNull, or } from "drizzle-orm";
import { color } from "../../../db/schema/color";
import { getPagination } from "../../../utils/pagination";

export const getAdditionalscan = async (req: Request, res: Response) => {
  try {
    const { typeList = "1" } = req.query; // 1 = list with children, 2 = list without children
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc"
        ? asc(additionalscan.createdAt)
        : desc(additionalscan.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(additionalscan);
    const rows = await db
      .select({
        id: additionalscan.id,
        title: additionalscan.title,
        price: additionalscan.price,
        color: color.code,
        file: additionalscan.file,
        category: additionalscan.category,
        parent_id: additionalscan.parent_id,
      })
      .from(additionalscan)
      .leftJoin(color, eq(additionalscan.color, color.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    const map = new Map();

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    const tree = [];

    for (const row of rows) {
      if (row.parent_id === null) {
        tree.push(map.get(row.id));
      } else {
        map.get(row.parent_id)?.children.push(map.get(row.id));
      }
    }
    return successResponse(
      res,
      200,
      {
        items: typeList === "1" ? tree : rows,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "AdditionalScan fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getAdditionalscanByCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { category, sort } = req.params;
    const categoryNumber = parseInt(category);
    const orderByClause =
      sort === "asc"
        ? asc(additionalscan.createdAt)
        : desc(additionalscan.createdAt);
    const rows = await db
      .select({
        id: additionalscan.id,
        title: additionalscan.title,
        price: additionalscan.price,
        file: additionalscan.file,
        parent_id: additionalscan.parent_id,
        color: color.code,
        category: additionalscan.category,
      })
      .from(additionalscan)
      .where(or(eq(additionalscan.category, categoryNumber), isNull(additionalscan.category)))
      .leftJoin(color, eq(additionalscan.color, color.id))
      .orderBy(orderByClause);

    const map = new Map();

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    const tree = [];

    for (const row of rows) {
      if (row.parent_id === null) {
        tree.push(map.get(row.id));
      } else {
        map.get(row.parent_id)?.children.push(map.get(row.id));
      }
    }
    return successResponse(
      res,
      200,
      tree,
      "AdditionalScan fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};


export const getAdditionalscanDropdown = async (
  req: Request,
  res: Response
) => {
  try {
    const additionalscanList = await db
      .select({
        id: additionalscan.id,
        title: additionalscan.title,
      })
      .from(additionalscan)
      .where(isNull(additionalscan.parent_id))
      .orderBy(asc(additionalscan.title));
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
    const { title, price, color, category, parent_id } = req.body;
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
    const values: any = {
      title,
      price: price ? String(price) : null,
      color: color ? parseInt(color) : null,
      file: file.path,
      category: category ? parseInt(category) : null,
    };
    if (parent_id !== "0") {
      values.parent_id = parseInt(parent_id);
    } else {
      values.parent_id = null;
    }
    const additionalscanItem = await db
      .insert(additionalscan)
      .values(values)
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
    const { title, price, color, category, parent_id } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (price) updateData.price = price;
    if (color) updateData.color = color;
    if (category) updateData.category = parseInt(category);
    if (parent_id) updateData.parent_id = parseInt(parent_id);
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
