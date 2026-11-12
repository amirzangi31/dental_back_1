import { Request, Response } from "express";
import { db } from "../../../db";
import { category } from "../../../db/schema/category";
import { files } from "../../../db/schema/files";
import { errorResponse, successResponse } from "../../../utils/responses";
import { asc, count, desc, eq } from "drizzle-orm";
import { catalog } from "../../../db/schema/catalog";
import { color } from "../../../db/schema/color";
import { getPagination } from "../../../utils/pagination";

const optionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "" || text === "null" || text === "undefined") return null;
  return text;
};

const optionalId = (value: unknown): number | null => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "undefined" ||
    value === 0 ||
    value === "0"
  ) {
    return null;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(category.createdAt) : desc(category.createdAt);
    const [{ total }] = await db.select({ total: count() }).from(category);
    const categoryList = await db
      .select({
        id: category.id,
        title: category.title,
        description: category.description,
        file: category.file,
        price: category.price,
        color: {
          id: color.id,
          color: color.code,
        },
        catalog: {
          id: catalog.id,
          title: catalog.title,
        },
      })
      .from(category)
      .where(eq(category.isDeleted, 0))
      .leftJoin(catalog, eq(category.catalog, catalog.id))
      .leftJoin(color, eq(category.color, color.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: categoryList,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Category fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const getCategoryDropDown = async (req: Request, res: Response) => {
  try {
    const categoryList = await db
      .select({
        id: category.id,
        title: category.title,
      })
      .from(category)
      .where(eq(category.isDeleted , 0))
      .orderBy(asc(category.title));

    return successResponse(
      res,
      200,
      categoryList,
      "Category fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, description, price, catalog, color } = req.body;
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

    const categoryItem = await db
      .insert(category)
      .values({
        title,
        description: optionalText(description),
        price: price ? String(price) : null,
        catalog: optionalId(catalog),
        file: file.path,
        color: optionalId(color),
      })
      .returning();

    return successResponse(
      res,
      200,
      { category: categoryItem },
      "Category created successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { title, description, price, catalog, color } = req.body;
    const file = req.file;

    const updateData: any = {};
    if (title) updateData.title = title;
    if ("description" in req.body) updateData.description = optionalText(description);
    if (price) updateData.price = String(price);
    if ("catalog" in req.body) updateData.catalog = optionalId(catalog);
    if ("color" in req.body) updateData.color = optionalId(color);
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
    const categoryItem = await db
      .update(category)
      .set(updateData)
      .where(eq(category.id, Number(req.params.id)))
      .returning();

    return successResponse(
      res,
      200,

      { categoryItem },
      "Category updated successfully",
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryItem = await db
      .update(category)
      .set({ isDeleted: 1 })
      .where(eq(category.id, Number(req.params.id)));
    return successResponse(
      res,
      200,
      categoryItem,
      "Category deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};
